export interface Client {
  id: string;
  name: string;
  nif: string;
  createdAt: string;
}

export type ClientInput = Pick<Client, 'name' | 'nif'>;
