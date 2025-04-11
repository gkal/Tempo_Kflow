# Form Link Implementation Documentation

## 1. Overview

The Form Link feature allows customers to receive an automatically generated offer form via email link. This feature streamlines the offer process by:

1. Enabling customer service representatives to send personalized form links directly from customer profiles
2. Automatically creating new offers when form links are generated
3. Allowing customers to view and respond to offers through a mobile-optimized interface
4. Capturing customer feedback and automatically updating the system

## 2. Revised Approach

### Key Changes from Original Plan

- **Customer-Centric vs. Offer-Centric**: The form link button will be placed on the customer detail page instead of the offer detail page. This allows for generating form links without requiring a pre-existing offer.
- **Automatic Offer Creation**: When a form link is generated, the system automatically creates a new offer with default values and associates it with the customer.
- **Streamlined Workflow**: The entire process requires fewer steps from the customer service representative's perspective.

## 3. User Flow 

### Customer Service Representative Flow

1. Navigate to a customer's detail page
2. Click the "Send Form Link" button
3. System automatically creates a new offer for the customer with default values
4. System generates a secure form link tied to the offer
5. Choose email delivery method:
   - Direct via Resend (automatic)
   - Via Gmail (opens Gmail compose with pre-filled content)
6. View form link history and submission status on the customer detail page

### Customer Flow

1. Receive email with form link
2. Click link to open mobile-optimized form
3. View offer details and form fields
4. Accept or decline the offer
5. Provide additional information (comments, contact details, etc.)
6. Submit the form
7. View success confirmation

## 4. Technical Implementation

### 4.1 Database Structure

The database maintains the relationship between customers, offers, and form links:

```
Customers
  ↑
  | one-to-many
  ↓
Offers --------- one-to-many --------→ FormLinks
```

#### Form Links Table (`offer_form_links`)

| Column       | Type      | Description                                     |
|--------------|-----------|------------------------------------------------|
| id           | UUID      | Primary key                                     |
| offer_id     | UUID      | Foreign key reference to offers                 |
| token        | TEXT      | Unique token for form link access               |
| is_used      | BOOLEAN   | Whether the form has been submitted             |
| created_at   | TIMESTAMP | Creation timestamp                              |
| expires_at   | TIMESTAMP | Expiration timestamp                            |
| is_deleted   | BOOLEAN   | Soft delete flag                                |
| deleted_at   | TIMESTAMP | Soft delete timestamp                           |

### 4.2 Service Architecture

The system uses a modular service architecture with the following components:

1. **CustomerOfferService** (New)
   - Creates offers automatically based on customer data
   - Sets default values for the offer

2. **FormLinkService** (Existing)
   - Generates secure tokens for form access
   - Validates tokens and tracks form usage

3. **OfferFormService** (Existing)
   - Retrieves offer data for display in forms
   - Updates offers based on form submissions

4. **EmailService** (Existing)
   - Sends form links via email
   - Sends notifications on form submission

5. **GmailService** (Existing)
   - Generates Gmail compose URLs for manual email sending

6. **FormApiService** (Existing)
   - Provides a unified API for frontend interactions
   - Will be updated to incorporate automatic offer creation

### 4.3 Key API Methods

#### New Methods (To Be Implemented)

```typescript
// CustomerOfferService
async function createOfferForCustomer(
  customerId: string, 
  options?: { 
    type?: string;
    status?: string;
    assignedToUserId?: string;
  }
): Promise<Offer>

// FormApiService (Updated)
async function createFormLinkForCustomer(
  customerId: string,
  expirationHours: number = 48,
  sendEmail: boolean = false,
  recipientEmail?: string
): Promise<ApiResponse<FormLinkCreationResponse>>
```

#### Existing Methods (Already Implemented)

```typescript
// FormLinkService
async function generateFormLink(offerId: string, expirationHours: number): Promise<FormLink>
async function validateFormLink(token: string): Promise<FormLinkValidationResult>
async function markFormLinkAsUsed(token: string): Promise<boolean>
async function getFormLinksByOfferId(offerId: string): Promise<FormLink[]>

// OfferFormService
async function getOfferDataForForm(offerId: string): Promise<OfferFormData>
async function getCustomerInfoForOffer(offerId: string): Promise<CustomerFormInfo>
async function updateOfferFromFormSubmission(offerId: string, formData: OfferFormSubmission): Promise<Offer>

// EmailService
async function sendFormLinkToCustomer(formLink: FormLinkWithOffer, recipient?: string): Promise<{ success: boolean }>
async function sendFormSubmissionNotification(offerId: string, accepted: boolean, comments?: string): Promise<{ success: boolean }>

// GmailService
function generateGmailComposeUrl(options: GmailComposeOptions): string
async function generateFormLinkEmailUrl(formLink: FormLink, recipientEmail?: string): Promise<string>
```

## 5. Frontend Implementation

### 5.1 Customer Detail Page Updates

The customer detail page will be enhanced with:

- A "Send Form Link" button in the action menu
- A new tab or section for "Form Links" showing:
  - All form links generated for the customer
  - Status (pending, used, expired)
  - Creation and expiration dates
  - Associated offer details
  - Response status (accepted/rejected)

### 5.2 Form Pages

The form experience will include:

- Token validation to ensure security
- Mobile-optimized layout
- Clear presentation of offer details
- Simple accept/reject buttons
- Additional fields for customer feedback
- Success/failure/expired states
- Responsive design with Tailwind CSS

## 6. Security Considerations

1. **Secure Token Generation**: Form link tokens are cryptographically secure and cannot be guessed
2. **Expiration**: All form links have a configurable expiration time (default 48 hours)
3. **One-Time Use**: Form links can only be used once
4. **Rate Limiting**: API endpoints are protected against brute force attacks
5. **Data Sanitization**: All form inputs are sanitized to prevent injection attacks

## 7. Error Handling

The system includes comprehensive error handling for:

1. **Invalid Tokens**: Clear error messages for expired or invalid tokens
2. **Form Submission Failures**: Graceful handling of submission errors
3. **Email Delivery Issues**: Fallback mechanisms if email delivery fails
4. **Offer Creation Failures**: Validation and error handling for automatic offer creation

## 8. Monitoring and Analytics

The implementation includes:

1. **Form View Tracking**: Monitor how many customers view the form
2. **Submission Rate Tracking**: Track the percentage of forms that are submitted
3. **Response Time Metrics**: Measure how quickly customers respond to form links
4. **Error Monitoring**: Track and alert on form-related errors

## 9. Implementation Plan

The feature will be implemented in the following order:

1. Create the CustomerOfferService for automatic offer creation
2. Update the FormApiService to support customer-based form link creation
3. Implement the customer detail page UI changes
4. Develop the mobile-optimized form components
5. Set up the form context for state management
6. Implement security features
7. Conduct testing and deployment

## 10. Future Enhancements

Potential future enhancements include:

1. **Template Management**: Allow custom templates for different offer types
2. **Multi-step Forms**: Support more complex, multi-page form experiences
3. **Digital Signatures**: Add support for customer signatures on accepted offers
4. **Payment Integration**: Allow customers to make payments as part of the offer acceptance
5. **SMS Delivery**: Send form links via SMS in addition to email

## 11. Conclusion

The revised Form Link implementation provides a more streamlined, customer-centric approach to offer management. By automatically creating offers when form links are generated, the system reduces manual steps and improves efficiency for customer service representatives while providing a better experience for customers. 