import type { RrhhBackupData } from "../../accounting/core/types/accountingTypes";

export type RrhhToast = {
  title: string;
  description: string;
};

export type RrhhTabProps = {
  rrhh: RrhhBackupData;
  saving: boolean;
  onSave: (nextRrhh: RrhhBackupData, toast: RrhhToast) => void;
};