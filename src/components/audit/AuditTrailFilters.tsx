import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { AuditActionType, AuditSeverity } from '@/services/auditTrailService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { Calendar } from '@/components/ui/Calendar';
import { Badge } from '@/components/ui/Badge';
import { fetchUsers } from '@/services/userService';
import { AuditTrailFiltersState } from './AuditTrailDashboard';
import { cn } from '@/lib/utils';

interface AuditTrailFiltersProps {
  filters: AuditTrailFiltersState;
  onChange: (filters: Partial<AuditTrailFiltersState>) => void;
}

// Map of audit action types to Greek labels
const actionTypeLabels: Record<AuditActionType, string> = {
  [AuditActionType.USER_LOGIN]: 'Σύνδεση Χρήστη',
  [AuditActionType.USER_LOGOUT]: 'Αποσύνδεση Χρήστη',
  [AuditActionType.USER_CREATED]: 'Δημιουργία Χρήστη',
  [AuditActionType.USER_UPDATED]: 'Ενημέρωση Χρήστη',
  [AuditActionType.USER_DELETED]: 'Διαγραφή Χρήστη',
  [AuditActionType.USER_ROLE_CHANGED]: 'Αλλαγή Ρόλου Χρήστη',
  
  [AuditActionType.FORM_CREATED]: 'Δημιουργία Φόρμας',
  [AuditActionType.FORM_UPDATED]: 'Ενημέρωση Φόρμας',
  [AuditActionType.FORM_DELETED]: 'Διαγραφή Φόρμας',
  [AuditActionType.FORM_VIEWED]: 'Προβολή Φόρμας',
  [AuditActionType.FORM_SUBMITTED]: 'Υποβολή Φόρμας',
  [AuditActionType.FORM_LINK_CREATED]: 'Δημιουργία Συνδέσμου Φόρμας',
  [AuditActionType.FORM_LINK_SENT]: 'Αποστολή Συνδέσμου Φόρμας',
  [AuditActionType.FORM_LINK_EXPIRED]: 'Λήξη Συνδέσμου Φόρμας',
  [AuditActionType.FORM_TEMPLATE_MODIFIED]: 'Τροποποίηση Προτύπου Φόρμας',
  [AuditActionType.FORM_FIELD_ADDED]: 'Προσθήκη Πεδίου Φόρμας',
  [AuditActionType.FORM_FIELD_UPDATED]: 'Ενημέρωση Πεδίου Φόρμας',
  [AuditActionType.FORM_FIELD_REMOVED]: 'Αφαίρεση Πεδίου Φόρμας',
  [AuditActionType.FORM_VALIDATION_MODIFIED]: 'Τροποποίηση Κανόνων Επικύρωσης Φόρμας',
  
  [AuditActionType.APPROVAL_REQUESTED]: 'Αίτημα Έγκρισης',
  [AuditActionType.FORM_APPROVED]: 'Έγκριση Φόρμας',
  [AuditActionType.FORM_REJECTED]: 'Απόρριψη Φόρμας',
  [AuditActionType.APPROVAL_REMINDER_SENT]: 'Αποστολή Υπενθύμισης Έγκρισης',
  [AuditActionType.APPROVAL_NOTIFICATION_SENT]: 'Αποστολή Ειδοποίησης Έγκρισης',
  
  [AuditActionType.OFFER_CREATED_FROM_FORM]: 'Δημιουργία Προσφοράς από Φόρμα',
  [AuditActionType.OFFER_UPDATED]: 'Ενημέρωση Προσφοράς',
  [AuditActionType.OFFER_DELETED]: 'Διαγραφή Προσφοράς',
  
  [AuditActionType.CUSTOMER_CREATED]: 'Δημιουργία Πελάτη',
  [AuditActionType.CUSTOMER_UPDATED]: 'Ενημέρωση Πελάτη',
  [AuditActionType.CUSTOMER_DELETED]: 'Διαγραφή Πελάτη',
  
  [AuditActionType.CONFIG_UPDATED]: 'Ενημέρωση Ρυθμίσεων',
  [AuditActionType.SECURITY_SETTING_CHANGED]: 'Αλλαγή Ρυθμίσεων Ασφαλείας',
  [AuditActionType.EMAIL_TEMPLATE_MODIFIED]: 'Τροποποίηση Προτύπου Email',
  [AuditActionType.SYSTEM_PARAMETER_UPDATED]: 'Ενημέρωση Παραμέτρων Συστήματος',
  [AuditActionType.FEATURE_FLAG_CHANGED]: 'Αλλαγή Feature Flag',
  
  [AuditActionType.DATA_EXPORTED]: 'Εξαγωγή Δεδομένων',
  [AuditActionType.REPORT_GENERATED]: 'Δημιουργία Αναφοράς',
  
  [AuditActionType.SECURITY_ERROR]: 'Σφάλμα Ασφαλείας',
  [AuditActionType.VALIDATION_ERROR]: 'Σφάλμα Επικύρωσης',
  [AuditActionType.SYSTEM_ERROR]: 'Σφάλμα Συστήματος'
};

// Map of severity levels to Greek labels and colors
const severityLabels: Record<AuditSeverity, { label: string, color: string }> = {
  [AuditSeverity.INFO]: { label: 'Πληροφορία', color: 'bg-blue-100 text-blue-800' },
  [AuditSeverity.WARNING]: { label: 'Προειδοποίηση', color: 'bg-yellow-100 text-yellow-800' },
  [AuditSeverity.ERROR]: { label: 'Σφάλμα', color: 'bg-red-100 text-red-800' },
  [AuditSeverity.CRITICAL]: { label: 'Κρίσιμο', color: 'bg-red-200 text-red-900' }
};

// Common target types
const commonTargetTypes = [
  { value: 'form_link', label: 'Σύνδεσμος Φόρμας' },
  { value: 'form_template', label: 'Πρότυπο Φόρμας' },
  { value: 'customer', label: 'Πελάτης' },
  { value: 'offer', label: 'Προσφορά' },
  { value: 'user', label: 'Χρήστης' },
  { value: 'config', label: 'Ρυθμίσεις' },
  { value: 'email_template', label: 'Πρότυπο Email' }
];

// Common tags
const commonTags = [
  { value: 'security', label: 'Ασφάλεια' },
  { value: 'form', label: 'Φόρμα' },
  { value: 'user', label: 'Χρήστης' },
  { value: 'customer', label: 'Πελάτης' },
  { value: 'offer', label: 'Προσφορά' },
  { value: 'approval', label: 'Έγκριση' },
  { value: 'configuration', label: 'Ρυθμίσεις' },
  { value: 'export', label: 'Εξαγωγή' },
  { value: 'error', label: 'Σφάλμα' }
];

// Action type groups
const actionTypeGroups = [
  {
    label: 'Χρήστες',
    types: [
      AuditActionType.USER_LOGIN,
      AuditActionType.USER_LOGOUT,
      AuditActionType.USER_CREATED,
      AuditActionType.USER_UPDATED,
      AuditActionType.USER_DELETED,
      AuditActionType.USER_ROLE_CHANGED
    ]
  },
  {
    label: 'Φόρμες',
    types: [
      AuditActionType.FORM_CREATED,
      AuditActionType.FORM_UPDATED,
      AuditActionType.FORM_DELETED,
      AuditActionType.FORM_VIEWED,
      AuditActionType.FORM_SUBMITTED,
      AuditActionType.FORM_LINK_CREATED,
      AuditActionType.FORM_LINK_SENT,
      AuditActionType.FORM_LINK_EXPIRED,
      AuditActionType.FORM_TEMPLATE_MODIFIED,
      AuditActionType.FORM_FIELD_ADDED,
      AuditActionType.FORM_FIELD_UPDATED,
      AuditActionType.FORM_FIELD_REMOVED,
      AuditActionType.FORM_VALIDATION_MODIFIED
    ]
  },
  {
    label: 'Διαδικασία Έγκρισης',
    types: [
      AuditActionType.APPROVAL_REQUESTED,
      AuditActionType.FORM_APPROVED,
      AuditActionType.FORM_REJECTED,
      AuditActionType.APPROVAL_REMINDER_SENT,
      AuditActionType.APPROVAL_NOTIFICATION_SENT
    ]
  },
  {
    label: 'Προσφορές',
    types: [
      AuditActionType.OFFER_CREATED_FROM_FORM,
      AuditActionType.OFFER_UPDATED,
      AuditActionType.OFFER_DELETED
    ]
  },
  {
    label: 'Πελάτες',
    types: [
      AuditActionType.CUSTOMER_CREATED,
      AuditActionType.CUSTOMER_UPDATED,
      AuditActionType.CUSTOMER_DELETED
    ]
  },
  {
    label: 'Ρυθμίσεις Συστήματος',
    types: [
      AuditActionType.CONFIG_UPDATED,
      AuditActionType.SECURITY_SETTING_CHANGED,
      AuditActionType.EMAIL_TEMPLATE_MODIFIED,
      AuditActionType.SYSTEM_PARAMETER_UPDATED,
      AuditActionType.FEATURE_FLAG_CHANGED
    ]
  },
  {
    label: 'Εξαγωγή & Αναφορές',
    types: [
      AuditActionType.DATA_EXPORTED,
      AuditActionType.REPORT_GENERATED
    ]
  },
  {
    label: 'Σφάλματα',
    types: [
      AuditActionType.SECURITY_ERROR,
      AuditActionType.VALIDATION_ERROR,
      AuditActionType.SYSTEM_ERROR
    ]
  }
];

/**
 * AuditTrailFilters - Component for filtering audit trails
 */
const AuditTrailFilters: React.FC<AuditTrailFiltersProps> = ({ filters, onChange }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [users, setUsers] = useState<{ id: string, name: string }[]>([]);
  const [localSearchText, setLocalSearchText] = useState<string>(filters.search);
  
  // Fetch users for filter dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await fetchUsers();
        setUsers(data.map((user: any) => ({
          id: user.id,
          name: user.full_name || user.email || user.id
        })));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    loadUsers();
  }, []);
  
  // Create list of all audit action types for select dropdown
  const allActionTypes = Object.values(AuditActionType).map(type => ({
    value: type,
    label: actionTypeLabels[type] || type
  }));
  
  // Create list of all severity levels for select dropdown
  const allSeverities = Object.values(AuditSeverity).map(severity => ({
    value: severity,
    label: severityLabels[severity].label,
    color: severityLabels[severity].color
  }));
  
  // Handle action type toggle
  const handleActionTypeToggle = (type: AuditActionType) => {
    const updatedTypes = filters.actionTypes.includes(type)
      ? filters.actionTypes.filter(t => t !== type)
      : [...filters.actionTypes, type];
    
    onChange({ actionTypes: updatedTypes });
  };
  
  // Handle severity toggle
  const handleSeverityToggle = (severity: AuditSeverity) => {
    const updatedSeverities = filters.severities.includes(severity)
      ? filters.severities.filter(s => s !== severity)
      : [...filters.severities, severity];
    
    onChange({ severities: updatedSeverities });
  };
  
  // Handle tag toggle
  const handleTagToggle = (tag: string) => {
    const updatedTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    
    onChange({ tags: updatedTags });
  };
  
  // Handle search input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ search: localSearchText });
  };
  
  // Handle date range selection
  const handleDateChange = (field: 'dateFrom' | 'dateTo', date: Date | null) => {
    onChange({ [field]: date });
  };
  
  // Handle reset filters
  const handleResetFilters = () => {
    onChange({
      actionTypes: [],
      userId: null,
      targetType: null,
      targetId: null,
      severities: [],
      tags: [],
      search: ''
    });
    setLocalSearchText('');
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Αναζήτηση καταγραφών..."
              value={localSearchText}
              onChange={(e) => setLocalSearchText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Αναζήτηση</Button>
          </div>
        </form>
        
        {/* Date range selection */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[180px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? (
                  format(filters.dateFrom, 'dd/MM/yyyy')
                ) : (
                  <span>Από ημερομηνία</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateFrom || undefined}
                onSelect={(date) => handleDateChange('dateFrom', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[180px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? (
                  format(filters.dateTo, 'dd/MM/yyyy')
                ) : (
                  <span>Έως ημερομηνία</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateTo || undefined}
                onSelect={(date) => handleDateChange('dateTo', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Toggle expanded filters */}
        <Button 
          variant="outline" 
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Λιγότερα Φίλτρα' : 'Περισσότερα Φίλτρα'}
        </Button>
        
        {/* Reset filters */}
        <Button 
          variant="outline" 
          onClick={handleResetFilters}
          className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
        >
          Επαναφορά Φίλτρων
        </Button>
      </div>
      
      {/* Selected filters display */}
      {(filters.actionTypes.length > 0 || 
        filters.severities.length > 0 || 
        filters.tags.length > 0 || 
        filters.userId || 
        filters.targetType) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.actionTypes.map(type => (
            <Badge 
              key={type} 
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => handleActionTypeToggle(type)}
            >
              {actionTypeLabels[type] || type} ×
            </Badge>
          ))}
          
          {filters.severities.map(severity => (
            <Badge 
              key={severity} 
              className={cn("cursor-pointer", severityLabels[severity].color)}
              onClick={() => handleSeverityToggle(severity)}
            >
              {severityLabels[severity].label} ×
            </Badge>
          ))}
          
          {filters.tags.map(tag => (
            <Badge 
              key={tag} 
              variant="outline"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => handleTagToggle(tag)}
            >
              #{tag} ×
            </Badge>
          ))}
          
          {filters.userId && (
            <Badge 
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => onChange({ userId: null })}
            >
              Χρήστης: {users.find(u => u.id === filters.userId)?.name || filters.userId} ×
            </Badge>
          )}
          
          {filters.targetType && (
            <Badge 
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => onChange({ targetType: null, targetId: null })}
            >
              Τύπος: {commonTargetTypes.find(t => t.value === filters.targetType)?.label || filters.targetType} ×
            </Badge>
          )}
          
          {filters.targetId && (
            <Badge 
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => onChange({ targetId: null })}
            >
              ID: {filters.targetId} ×
            </Badge>
          )}
        </div>
      )}
      
      {/* Expanded filters */}
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-md">
          {/* User Filter */}
          <div>
            <Label htmlFor="user-filter">Φιλτράρισμα ανά Χρήστη</Label>
            <Select
              value={filters.userId || ''}
              onValueChange={(value) => onChange({ userId: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε χρήστη" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Όλοι οι χρήστες</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Target Type Filter */}
          <div>
            <Label htmlFor="target-type-filter">Φιλτράρισμα ανά Τύπο Στόχου</Label>
            <Select
              value={filters.targetType || ''}
              onValueChange={(value) => onChange({ targetType: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε τύπο" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Όλοι οι τύποι</SelectItem>
                {commonTargetTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Target ID Filter */}
          <div>
            <Label htmlFor="target-id-filter">ID Στόχου</Label>
            <Input
              id="target-id-filter"
              type="text"
              placeholder="Εισάγετε ID..."
              value={filters.targetId || ''}
              onChange={(e) => onChange({ targetId: e.target.value || null })}
            />
          </div>
          
          {/* Action Types Filter */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <Label className="mb-2 block">Τύποι Ενεργειών</Label>
            <div className="flex flex-wrap gap-2">
              {actionTypeGroups.map(group => (
                <div key={group.label} className="mb-2">
                  <h4 className="text-sm font-semibold text-gray-600 mb-1">{group.label}</h4>
                  <div className="flex flex-wrap gap-1">
                    {group.types.map(type => (
                      <Badge
                        key={type}
                        variant={filters.actionTypes.includes(type) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleActionTypeToggle(type)}
                      >
                        {actionTypeLabels[type] || type}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Severity Filter */}
          <div>
            <Label className="mb-2 block">Επίπεδο Σοβαρότητας</Label>
            <div className="flex flex-wrap gap-2">
              {allSeverities.map(severity => (
                <Badge
                  key={severity.value}
                  className={cn(
                    "cursor-pointer",
                    filters.severities.includes(severity.value as AuditSeverity)
                      ? severity.color
                      : "bg-gray-100 text-gray-800"
                  )}
                  onClick={() => handleSeverityToggle(severity.value as AuditSeverity)}
                >
                  {severity.label}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Tags Filter */}
          <div className="col-span-1 md:col-span-2">
            <Label className="mb-2 block">Ετικέτες</Label>
            <div className="flex flex-wrap gap-2">
              {commonTags.map(tag => (
                <Badge
                  key={tag.value}
                  variant={filters.tags.includes(tag.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag.value)}
                >
                  #{tag.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailFilters; 