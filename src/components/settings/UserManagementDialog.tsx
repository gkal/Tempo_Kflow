import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  department: string;
  role: string;
  status: string;
}

interface UserManagementDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function UserManagementDialog({
  open,
  onClose,
}: UserManagementDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const mockUsers: User[] = [
    {
      id: "1",
      username: "john.doe",
      fullname: "John Doe",
      email: "john@example.com",
      department: "Sales",
      role: "admin",
      status: "active",
    },
    // Add more mock users as needed
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-[#cad2c5]">
            Διαχείριση Χρηστών
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-[#354f52] text-[#cad2c5]"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <Button
            className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Νέος Χρήστης
          </Button>
          <SearchBar
            placeholder="Αναζήτηση χρήστη..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-64"
          />
        </div>

        <div className="border border-[#52796f] rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-[#354f52]/50">
                <TableHead className="text-[#84a98c]">Όνομα Χρήστη</TableHead>
                <TableHead className="text-[#84a98c]">Ονοματεπώνυμο</TableHead>
                <TableHead className="text-[#84a98c]">Email</TableHead>
                <TableHead className="text-[#84a98c]">Τμήμα</TableHead>
                <TableHead className="text-[#84a98c]">Ρόλος</TableHead>
                <TableHead className="text-[#84a98c]">Κατάσταση</TableHead>
                <TableHead className="text-[#84a98c]">Ενέργειες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-[#354f52]/50">
                  <TableCell className="text-[#cad2c5]">
                    {user.username}
                  </TableCell>
                  <TableCell className="text-[#cad2c5]">
                    {user.fullname}
                  </TableCell>
                  <TableCell className="text-[#cad2c5]">{user.email}</TableCell>
                  <TableCell className="text-[#cad2c5]">
                    {user.department}
                  </TableCell>
                  <TableCell className="text-[#cad2c5]">{user.role}</TableCell>
                  <TableCell className="text-[#cad2c5]">
                    {user.status}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
