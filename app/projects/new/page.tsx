"use client";

import ProjectForm from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-bg-primary p-8 pt-24">
      <ProjectForm isNew={true} />
    </div>
  );
}
