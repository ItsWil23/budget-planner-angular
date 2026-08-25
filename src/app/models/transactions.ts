import { CategoryType } from "./category";

export interface Transaction {
  id: string;
  label: string;
  categoryId: string;
  subcategoryId: string;
  date: string;
  amount: number;
  type: CategoryType;
}
