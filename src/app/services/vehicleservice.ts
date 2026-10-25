import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vehicle, VehicleInput } from '../models/vehicle.model';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly apiUrl = 'http://localhost:3000/vehicles';

  constructor(private readonly http: HttpClient) {}

  getVehicles(clientId: string): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl, {
      params: { clientId },
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  createVehicle(vehicle: VehicleInput): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.apiUrl, vehicle);
  }

  updateVehicle(id: string, vehicle: VehicleInput): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}`, vehicle);
  }

  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
