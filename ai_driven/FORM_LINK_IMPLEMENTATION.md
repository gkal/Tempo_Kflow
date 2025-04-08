# Customer Form Link System Implementation Guide

## 🎯 Project Overview
This document outlines the implementation steps for creating a secure offer form link system that allows:
- Generating unique form links for specific offers
- Sending these links via Gmail integration (same button creates link and opens Gmail)
- Collecting form submissions from customers related to specific offers
- Storing the data directly in the existing offer records
- Sending complete submission data via email notification
- Implementing proper security measures and expiration

## 📋 Phase 1: Database Setup

1. **Create Offer Form Links Table**
   ```sql
   CREATE TABLE offer_form_links (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     offer_id UUID REFERENCES offers(id) NOT NULL,
     token TEXT UNIQUE NOT NULL,
     is_used BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
     is_deleted BOOLEAN DEFAULT FALSE,
     deleted_at TIMESTAMP WITH TIME ZONE
   );
   ```

## 📦 Phase 2: Backend Implementation

1. **Create FormLinkService (src/services/formLinkService.ts)**
   - Implement functions for:
     - `generateFormLink(offerId: string, expirationHours: number)`
     - `validateFormLink(token: string)`
     - `markFormLinkAsUsed(token: string)`
     - `getFormLinksByOfferId(offerId: string)`

2. **Create OfferFormService (src/services/offerFormService.ts)**
   - Implement functions for:
     - `updateOfferFromFormSubmission(offerId: string, formData: any)`
     - `getOfferDataForForm(offerId: string)`
     - `getCustomerInfoForOffer(offerId: string)` - To get customer email for sending link

3. **Create Email Service with Resend (src/services/emailService.ts)**
   - Set up Resend client with API key
   - Implement functions for:
     - `sendFormLinkToCustomer(customerEmail: string, customerName: string, offerDetails: any, formLink: string)`
     - `sendFormSubmissionNotification(offerData: Offer, formData: any, previousData: any)`
   - Create detailed email template for form submissions that includes:
     - Complete form submission data (all fields)
     - Highlighting of new/changed values
     - Offer and customer information
     - Timestamp and link to view in system

4. **Create Gmail Integration Service (src/services/gmailService.ts)**
   - Implement function to generate Gmail compose URL:
     - `generateGmailComposeUrl(to: string, subject: string, body: string)`
   - Include the form link in the email body
   - Pre-populate customer email from offer/customer relationship

5. **Create API Routes**
   - `pages/api/forms/create-link.ts` - Generate link and return Gmail URL
   - `pages/api/forms/validate/[token].ts` - Validate token and return form configuration
   - `pages/api/forms/submit/[token].ts` - Submit form data and send email notification

## 🖼️ Phase 3: Frontend Implementation

1. **Create Offer Form Link Button with Integrated Gmail**
   - Add "Create Form Link" button to offer details page that:
     - Generates unique link for the specific offer
     - Immediately opens Gmail compose window with:
       - Pre-populated recipient (customer email from offer)
       - Pre-filled subject line with offer reference
       - Form link included in email body
     - Stores the link in database
     - Single click performs both actions (create link + open Gmail)

2. **Create Form Page Components**
   - `pages/form/[token].tsx` - Main form page that handles:
     - Token validation
     - Expiration checking
     - Form rendering with offer-specific information
     - Submission handling
     - Success/Error states

3. **Create Mobile-Optimized Form Components**
   - `src/components/forms/OfferForm.tsx` - The mobile-friendly form to be filled by customers
     - Use responsive Tailwind classes
     - Implement touch-friendly form controls
     - Ensure proper spacing for mobile inputs
     - Optimize for various screen sizes
     - Include offer-specific fields and information
   - `src/components/forms/FormExpired.tsx` - Component shown when form is expired
   - `src/components/forms/FormSuccess.tsx` - Success page after submission
   - `src/components/forms/FormError.tsx` - Error handling component

4. **Create Form Context (src/context/FormContext.tsx)**
   - State management for form
   - Validation logic
   - Form submission handling

## 🔒 Phase 4: Security Implementation

1. **Token Generation and Validation**
   - Use cryptographically secure UUIDs
   - Implement proper token validation logic
   - Add rate limiting to prevent abuse

2. **API Route Protection**
   - Implement rate limiting middleware
   - Add request validation
   - Set up proper CORS configuration

3. **Email Security with Resend**
   - Store Resend API key in environment variables
   - Implement proper email templates with branding
   - Ensure emails include privacy policy links
   - Set up proper email authentication (SPF, DKIM)

4. **Input Sanitization**
   - Implement server-side validation for all form inputs
   - Sanitize inputs before storing in database
   - Set up prepared statements for all database operations

## 🚀 Phase 5: Integration with Offer Management

1. **Update Offer Detail Page**
   - Add "Create Form Link" button to offer actions (with integrated Gmail opening)
   - Display form link history for offer
   - Show form submission status

2. **Update Offer Data Model**
   - Ensure offer model can handle all fields that will be collected via the form
   - Add appropriate validation for new fields if necessary

3. **Update Navigation Menu**
   - Add Form Links section to appropriate menu area
   - Add way to view all active/expired form links

## 📱 Phase 6: Testing and Deployment

1. **Local Testing with Mobile Focus**
   - Set up LocalTunnel for local testing
   - Create test script to automate LocalTunnel startup
   - Test extensively on mobile devices of different sizes
   - Verify mobile-friendly design and usability
   - Test integrated Gmail link creation workflow

2. **Security Testing**
   - Test token expiration
   - Test form submission with expired tokens
   - Test rate limiting
   - Test CSRF protection

3. **Integration Testing**
   - End-to-end testing of complete flow
   - Test email delivery with Resend
   - Test form submission and direct update to offer data
   - Verify data integrity after submission
   - Confirm email notifications include all form data

4. **Production Deployment Preparation**
   - Update environment variables for production
   - Configure proper CORS for production domain
   - Set up Resend for production use

## 🔍 Phase 7: Analytics and Monitoring

1. **Implement Form Analytics**
   - Track form views
   - Track submission rates
   - Monitor form abandonment

2. **Set up Error Monitoring**
   - Add logging for form errors
   - Set up notifications for failed submissions
   - Track token validation failures

## 📆 Timeline and Dependencies

1. **Phase 1: Database Setup** - 0.5 day
   - Dependencies: None

2. **Phase 2: Backend Implementation** - 3 days
   - Dependencies: Phase 1
   - Includes Gmail integration and detailed email notifications

3. **Phase 3: Frontend Implementation** - 4 days
   - Dependencies: Phase 2 (API routes)
   - Extra focus on mobile optimization and Gmail integration

4. **Phase 4: Security Implementation** - 2 days
   - Dependencies: Phases 2 and 3

5. **Phase 5: Integration** - 1.5 days
   - Dependencies: Phase 3

6. **Phase 6: Testing and Deployment** - 3 days
   - Dependencies: All previous phases
   - Include extensive mobile testing

7. **Phase 7: Analytics and Monitoring** - 1.5 days
   - Dependencies: Phase 6

**Total Estimated Time: 15.5 days**

## 📌 Additional Considerations

1. **Email Notifications for Form Submissions**
   - Complete form data included in notification emails
   - Well-formatted HTML emails with clear data presentation
   - Highlighting of changed/new values
   - Links to view full record in system
   - Timestamp and submission metadata
   - Option to reply directly to customer

2. **Gmail Integration for Sending Form Links**
   - Single button creates link AND opens Gmail in one action
   - Pre-populated recipient, subject, and body with offer details
   - Properly formatted email with branded elements
   - Clear instructions for the customer

3. **Mobile-First Form Design Considerations**
   - Responsive design optimized for small screens
   - Touch-friendly input controls (larger tap targets)
   - Simplified navigation for mobile users
   - Optimized keyboard experience on mobile
   - Minimized data entry where possible
   - Progressive disclosure of form sections
   - Proper viewport configuration
   - Testing on multiple device sizes 