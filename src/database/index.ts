import { DataService } from './DataService';
import type {
  Customer,
  Contact,
  ContactPosition,
  Department,
  Offer,
  OfferDetail,
  Task,
  User,
  ServiceCategory,
  ServiceSubcategory,
  Unit,
  Notification,
  OfferHistory,
  TaskHistory
} from '@/services/api/types';

/**
 * Database Services
 * 
 * This module exports pre-configured DataService instances for each table
 * in the database. Use these services to perform database operations in a
 * type-safe and consistent manner.
 * 
 * Each service automatically handles:
 * - Type safety for the specific table
 * - Error handling
 * - Soft deletion (where applicable)
 * - Audit logging (where applicable)
 * 
 * Example usage:
 * 
 * ```tsx
 * import { db } from '@/database';
 * 
 * // Get all active customers
 * const { data: customers, error } = await db.customers.getAll();
 * 
 * // Get a specific customer
 * const { data: customer, error } = await db.customers.getById('123');
 * 
 * // Create a new customer
 * const { data: newCustomer, error } = await db.customers.create({
 *   company_name: 'New Company',
 *   email: 'contact@company.com'
 * });
 * 
 * // Update a customer
 * const { data: updatedCustomer, error } = await db.customers.update('123', {
 *   company_name: 'Updated Company Name'
 * });
 * 
 * // Soft delete a customer
 * const { error } = await db.customers.softDelete('123');
 * ```
 */

/**
 * Customer table data service
 * Manages company/organization records
 */
export const customersService = DataService.forTable<Customer>('customers', {
  historyTable: 'customer_history'
});

/**
 * Contact table data service
 * Manages individual contacts associated with customers
 */
export const contactsService = DataService.forTable<Contact>('contacts', {
  historyTable: 'contact_history'
});

/**
 * Contact positions table data service
 * Manages job titles/positions for contacts
 */
export const contactPositionsService = DataService.forTable<ContactPosition>('contact_positions');

/**
 * Departments table data service
 * Manages internal departments
 */
export const departmentsService = DataService.forTable<Department>('departments');

/**
 * Offers table data service
 * Manages customer offers/proposals
 */
export const offersService = DataService.forTable<Offer>('offers', {
  historyTable: 'offer_history'
});

/**
 * Offer details table data service
 * Manages line items within offers
 */
export const offerDetailsService = DataService.forTable<OfferDetail>('offer_details', {
  historyTable: 'offer_detail_history'
});

/**
 * Tasks table data service
 * Manages to-do items and activities
 */
export const tasksService = DataService.forTable<Task>('tasks', {
  historyTable: 'task_history'
});

/**
 * Task history table data service
 * Manages audit logs for task changes
 */
export const taskHistoryService = DataService.forTable<TaskHistory>('task_history');

/**
 * Users table data service
 * Manages system users
 */
export const usersService = DataService.forTable<User>('users');

/**
 * Service categories table data service
 * Manages high-level service categories
 */
export const serviceCategoriesService = DataService.forTable<ServiceCategory>('service_categories');

/**
 * Service subcategories table data service
 * Manages detailed service subcategories
 */
export const serviceSubcategoriesService = DataService.forTable<ServiceSubcategory>('service_subcategories');

/**
 * Units table data service
 * Manages measurement units (hours, pieces, etc.)
 */
export const unitsService = DataService.forTable<Unit>('units');

/**
 * Notifications table data service
 * Manages user notifications
 */
export const notificationsService = DataService.forTable<Notification>('notifications');

/**
 * Offer history table data service
 * Manages audit logs for offer changes
 */
export const offerHistoryService = DataService.forTable<OfferHistory>('offer_history');

/**
 * Consolidated database access object
 * Provides a single entry point for all database services
 */
export const db = {
  customers: customersService,
  contacts: contactsService,
  contactPositions: contactPositionsService,
  departments: departmentsService,
  offers: offersService,
  offerDetails: offerDetailsService,
  tasks: tasksService,
  taskHistory: taskHistoryService,
  users: usersService,
  serviceCategories: serviceCategoriesService,
  serviceSubcategories: serviceSubcategoriesService,
  units: unitsService,
  notifications: notificationsService,
  offerHistory: offerHistoryService
};

// Default export for convenience
export default db; 