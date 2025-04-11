import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Check, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { gdprComplianceService, DataSubjectRequest } from '@/services/gdprComplianceService';
import { cn } from '@/lib/utils';

// Define the form schema with Zod
const formSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  request_type: z.enum(['access', 'deletion', 'rectification', 'portability', 'restriction', 'objection'], {
    required_error: 'Please select the type of request.',
  }),
  details: z.string().min(10, {
    message: 'Details must be at least 10 characters.',
  }).max(1000, {
    message: 'Details cannot exceed 1000 characters.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface DataSubjectRequestFormProps {
  userId?: string;
  customerId?: string;
  onRequestSubmitted?: (requestId: string) => void;
  className?: string;
}

/**
 * A form for submitting GDPR data subject requests (access, deletion, etc.)
 */
export const DataSubjectRequestForm: React.FC<DataSubjectRequestFormProps> = ({
  userId,
  customerId,
  onRequestSubmitted,
  className,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Set up the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      request_type: 'access',
      details: '',
    },
  });

  const requestTypeLabels: Record<DataSubjectRequest['request_type'], string> = {
    access: 'Access My Data',
    deletion: 'Delete My Data',
    rectification: 'Correct My Data',
    portability: 'Export My Data',
    restriction: 'Restrict Processing',
    objection: 'Object to Processing',
  };

  const requestTypeDescriptions: Record<DataSubjectRequest['request_type'], string> = {
    access: 'Request to access all personal data we store about you.',
    deletion: 'Request to delete all your personal data (Right to be Forgotten).',
    rectification: 'Request to correct inaccurate personal data we store about you.',
    portability: 'Request to receive your data in a machine-readable format for transfer.',
    restriction: 'Request to temporarily restrict the processing of your data.',
    objection: 'Object to the processing of your personal data.',
  };

  // Submit handler
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Generate a verification token (in a real app, this would be a secure random token)
      const verificationToken = `vt_${Math.random().toString(36).substring(2, 15)}`;
      
      // Submit the request
      const request = await gdprComplianceService.submitDataSubjectRequest({
        request_type: values.request_type,
        user_id: userId,
        customer_id: customerId,
        email: values.email,
        verification_token: verificationToken,
        is_verified: false,
        request_data: {
          details: values.details,
          submitted_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          ip_address: window.location.hostname,
        },
      });
      
      if (request) {
        setSubmitSuccess(true);
        setRequestId(request.id);
        
        if (onRequestSubmitted) {
          onRequestSubmitted(request.id);
        }
        
        // In a real implementation, we would send a verification email here
        // with a link containing the verification token
      } else {
        setSubmitError('Failed to submit your request. Please try again.');
      }
    } catch (error) {
      setSubmitError(`Error: ${(error as Error).message}`);
      console.error('Error submitting data subject request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset();
    setSubmitSuccess(false);
    setSubmitError(null);
    setRequestId(null);
  };

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle>GDPR Data Request</CardTitle>
        <CardDescription>
          Submit a request regarding your personal data under the General Data Protection Regulation (GDPR).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitSuccess ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Request Submitted Successfully</AlertTitle>
              <AlertDescription className="text-green-700">
                Your request has been received. We'll send a verification email to confirm your request.
                Please check your inbox and follow the instructions to verify your request.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground mt-4">
              <p>Request ID: {requestId}</p>
              <p className="mt-2">We'll process your request as soon as you verify your email address. 
              If you don't receive an email within the next 15 minutes, please check your spam folder.</p>
            </div>
            <Button onClick={handleReset} className="mt-4">Submit Another Request</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="request_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(requestTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center mt-2">
                      <Info className="h-4 w-4 text-muted-foreground mr-2" />
                      <p className="text-xs text-muted-foreground">
                        {requestTypeDescriptions[field.value as DataSubjectRequest['request_type']]}
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide any additional information that will help us process your request..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <div className="flex justify-between mt-1">
                      <FormMessage />
                      <p className={cn(
                        "text-xs",
                        field.value.length > 900 ? "text-orange-500" : "text-muted-foreground"
                      )}>
                        {field.value.length}/1000
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Verification Required</p>
                    <p className="mt-1">
                      After submitting this request, we'll send a verification email to the address you provided.
                      You'll need to verify your email to confirm the request before we can process it.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start text-xs text-muted-foreground">
        <p>
          Your personal data will be processed in accordance with our Privacy Policy and applicable data protection laws.
          We aim to respond to all legitimate requests within one month.
        </p>
      </CardFooter>
    </Card>
  );
};

export default DataSubjectRequestForm; 