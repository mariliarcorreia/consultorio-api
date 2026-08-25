-- CreateTable
CREATE TABLE "odontogram_entries" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "tooth_number" INTEGER NOT NULL,
    "surfaces" TEXT[],
    "condition" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "observation" TEXT,
    "professional_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odontogram_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "odontogram_entries" ADD CONSTRAINT "odontogram_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
