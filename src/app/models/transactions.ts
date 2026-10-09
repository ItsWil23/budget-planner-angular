import { CategoryType } from "./category";

export interface Transaction {
  id: string;
  label: string;
  categoryId: string;
  subcategoryId: string;
  date: string;
  amountCents: number;
  type: CategoryType;
}

export type TransactionInput = Omit<Transaction, 'amountCents'> & {
  amountEuros: number;
};

export type TransactionPresentation = Omit<Transaction, 'amountCents'> & {
  amountEuros: number;
};
