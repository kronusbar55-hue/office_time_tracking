"use client";

import EmployeeForm from "@/components/employees/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div className="min-h-[calc(100vh-6rem)] bg-background py-4">
      <EmployeeForm isNew={true} />
    </div>
  );
}
