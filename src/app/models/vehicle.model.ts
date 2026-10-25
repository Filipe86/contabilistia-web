export type VehicleEngine = 'electric' | 'diesel' | 'petrol';
export type VehicleCategory = 'commercial_3_seats';

export interface Vehicle {
  id: string;
  registration: string;
  engine: VehicleEngine;
  category: VehicleCategory;
  client: import('./client.model').Client | null;
  createdAt: string;
}

export type VehicleInput = Pick<Vehicle, 'registration' | 'engine' | 'category'> & { clientId: string };
