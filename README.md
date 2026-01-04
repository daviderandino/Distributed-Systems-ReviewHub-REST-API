# Project Structure
### json-schemas/

Contains the JSON schemas used for data validation.

### rest-api-design/

Contains the OpenAPI specification (openapi.yaml and openapi.json) describing the modified REST APIs.

### film-manager-implementation/

Contains the Node.js server implementation.

### controllers/

Handles HTTP requests and maps them to service logic.

### service/

Contains the business logic and database interactions.

### components/

Database connection and data models.

### database/

SQLite database files

# Instructions to Run the Code

### Install Dependencies: 
Navigate to the implementation folder:

```bash
cd film-manager-implementation
npm install
```

Start the server

```bash
cd film-manager-implementation
npm install
```

# Testing

Swagger UI: Access the documentation at http://localhost:3001/docs.

# Main Design Choices

To meet the exam specifications while maintaining the architecture of Lab 1, the following design choices were implemented:

### 1. State Management (invitationStatus)
In Lab 1, a review was simply created and existed. In this extension, the lifecycle of a review was redefined by adding an invitationStatus column to the reviews table.

pending: The default state when an owner issues a review. The review content cannot be updated by the user in this state.

accepted: The user has explicitly accepted the invitation (via PUT /api/films/public/invited). Only now can they write the actual review.

cancelled: The invitation has expired or been revoked.

expired: Used in logic to identify invitations that passed their deadline.

### 2. Lazy Expiration Strategy
A key requirement was handling the expirationDate. Instead of implementing an active background process (like a cron job) to constantly check and update the database status to 'expired', a lazy evaluation strategy was chosen:

Storage: The expiration date is stored as a standard ISO string in the database.

Evaluation: The check currentTime > expirationDate happens only when data is read (in ReviewsService.getFilmReviews or getSingleReview).

Behavior: If an invitation is found to be expired during a read operation, the service dynamically treats it as cancelled or hides it, ensuring the user always sees the correct status without the overhead of background synchronization.

### 3. Atomic Bulk Acceptance
To satisfy the requirement that users must be able to "accept all pending invitations in a single operation," a dedicated endpoint was created (PUT /api/films/public/invited).

Implementation: This is handled via a single SQL UPDATE statement in ReviewsService.acceptAllInvitedFilms.

Benefit: This guarantees atomicity. Either all eligible (pending and not expired) invitations are accepted, or none are, preventing partial data updates in case of failure.

### 4. Data Visibility and Filtering
Modifications were made to FilmsService.js and ReviewsService.js to strictly enforce visibility rules: for owners, the service logic exposes the full status (pending, accepted, expirationDate) of reviews associated with their films, and filtering is possible.

Query Optimization: The filtering for "pending" invitations is pushed down to the SQL query level (using WHERE clauses) rather than filtering arrays in JavaScript, optimizing performance for large datasets.