# Advanced Features - Additional Report Content

Below are the new detailed prose paragraphs describing the advanced features. You can copy and paste these paragraphs directly into the corresponding sections of your project report.

---

### Additions for Section 2: Objective of the Project

#### Automated Resource Optimization and Waitlist Queues
The platform aims to resolve seat-claim bottlenecks for high-demand campus events by implementing automated waitlists. The system monitors live capacities, placing overflow registrants into a sequential FIFO (First-In, First-Out) waitlist queue. When an active participant cancels their seat, the database triggers an automated transaction. This transaction promotes the next waitlisted user, generates their entry QR ticket, and emails it, ensuring full seat occupancy without manual host intervention.

#### Post-Event Attendee Feedback Loops
To establish a loop of continuous improvement for campus activities, the project implements a verified-only feedback system. Students who successfully scanned in at the entrance gates can rate completed events (1 to 5 stars) and submit detailed written reviews. These reviews are then indexed publicly in the event catalog, allowing future participants to make informed decisions.

#### Self-Service Password Recovery Systems
The system aims to give users complete control over their accounts by implementing a self-service password recovery module. If a student forgets their password, they can trigger an automated email dispatch that delivers a secure 6-digit numeric verification OTP, allowing them to reset their credentials securely without admin staff assistance.

---

### Additions for Section 3: Technology Stack Used

#### Mongoose Index Expirations and Auto-TTL Stores
For password reset security, the database integrates automated TTL (Time-To-Live) indexing via Mongoose. The `OTP` schema utilizes MongoDB’s background index threads to track the `expiresAt` timestamps. Once the 10-minute expiration window closes, MongoDB automatically removes the corresponding OTP document from the database collection.

#### Structured Calendar Synchronization Modules
The frontend incorporates standard MIME-type calendar compilers. The JavaScript controller converts event variables (times, locations, descriptions) into RFC 5545 formatted lines, downloading standard `.ics` calendar files directly in the browser to sync schedules with Apple, Google, or Outlook calendars.

---

### Additions for Section 4: Key Features Implemented

#### Automatic Waitlist Promotions
The registration router checks the database counts before creating ticket records. If the count matches the event capacity, the registrant is saved as `waitlisted` and receives an email notification. The cancellation router intercepts deletions. If a confirmed registration is deleted, the system locates the oldest waitlisted user, updates their status to `registered`, generates their QR ticket, and dispatches it via email.

#### Verified Attendee Feedback Systems
The feedback module verifies check-in status before accepting reviews. If the participant's attendance status is verified, the dashboard unlocks the feedback form. Once submitted, the review is saved to the database and displayed in the public catalog under the event card.

#### Dynamic iCal Exporter
The dashboard list includes a calendar exporter button. Clicking this compiles the event's data into a `.ics` calendar file in the browser, allowing users to import it directly into their personal calendar applications.

#### OTP Password Reset Flows
The auth routing engine includes a forgot-password view that checks the email against the database and sends a 6-digit verification code. The reset form verifies the code, runs password strength checks, and updates the user record, resetting failed login counters.

---

### Additions for Section 6: Challenges Faced & Learnings

#### Challenges: Preventing Race Conditions in Concurrent Cancellations
Handling waitlist promotions under concurrent cancellation requests presented a challenge. If multiple users cancelled their registrations simultaneously, the server could read the same waitlist queue state, resulting in duplicate promotions. We resolved this by wrapping the promotion logic in atomic database operations, ensuring waitlist promotions are processed sequentially.

#### Learnings: Designing Auto-Expiring Security Schemas
We learned the value of utilizing native database TTL indices. Instead of running continuous background cleanup scripts in Node.js, we configured MongoDB's background index threads to automatically expire and delete OTP documents after 10 minutes, reducing server load.
