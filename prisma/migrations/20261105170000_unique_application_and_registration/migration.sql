-- One application per student per listing.
CREATE UNIQUE INDEX "Application_studentId_scholarshipId_key"
  ON "Application"("studentId", "scholarshipId");

-- One semester registration per student per academic term.
CREATE UNIQUE INDEX "SemesterRegistration_studentId_academicYear_semester_key"
  ON "SemesterRegistration"("studentId", "academicYear", "semester");
