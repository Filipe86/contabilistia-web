import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Client } from '../models/client.model';
import { Vehicle, VehicleEngine, VehicleInput } from '../models/vehicle.model';
import { ClientService } from '../services/clientservice';
import { VehicleService } from '../services/vehicleservice';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.css'
})
export class Vehicles implements OnInit {
  vehicles: Vehicle[] = [];
  clients: Client[] = [];
  activeClient: Client | null = null;
  private activeClientId = '';
  form: VehicleInput = this.emptyForm();
  editingId: string | null = null;
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  readonly engines: { value: VehicleEngine; label: string }[] = [
    { value: 'electric', label: 'Elétrico' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'petrol', label: 'Gasolina' },
  ];

  constructor(
    private readonly vehicleService: VehicleService,
    private readonly clientService: ClientService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.clientService.clients$.subscribe((clients) => {
      this.clients = clients;
      this.activeClient = clients.find((client) => client.id === this.activeClientId) ?? null;
      this.changeDetector.markForCheck();
    });
    this.clientService.activeClientId$.subscribe((clientId) => {
      this.activeClientId = clientId;
      this.activeClient = this.clients.find((client) => client.id === clientId) ?? null;
      this.cancelEdit();
      if (clientId) {
        this.form.clientId = clientId;
        this.loadVehicles();
      } else {
        this.vehicles = [];
        this.loading = false;
      }
      this.changeDetector.markForCheck();
    });
  }

  loadVehicles(): void {
    if (!this.activeClientId) {
      this.vehicles = [];
      this.loading = false;
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.vehicleService.getVehicles(this.activeClientId).subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar os veículos. Tente novamente.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  submitVehicle(): void {
    const registration = this.form.registration.trim();
    if (!registration || !this.form.engine || !this.form.category || !this.activeClientId) {
      this.errorMessage = 'Selecione um cliente e preencha a matrícula, o motor e a categoria.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const vehicle: VehicleInput = { ...this.form, registration, clientId: this.activeClientId };
    const request = this.editingId
      ? this.vehicleService.updateVehicle(this.editingId, vehicle)
      : this.vehicleService.createVehicle(vehicle);

    request.subscribe({
      next: (savedVehicle) => {
        if (this.editingId) {
          this.vehicles = this.vehicles.map((item) =>
            item.id === savedVehicle.id ? savedVehicle : item,
          );
          this.successMessage = 'Veículo atualizado com sucesso.';
        } else {
          this.vehicles = [...this.vehicles, savedVehicle]
            .sort((first, second) => first.registration.localeCompare(second.registration));
          this.successMessage = 'Veículo adicionado com sucesso.';
        }
        this.cancelEdit();
        this.saving = false;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.status === 409
          ? 'Já existe um veículo com esta matrícula.'
          : error.status === 400
            ? 'Verifique os dados do veículo e tente novamente.'
            : 'Não foi possível guardar o veículo. Tente novamente.';
        this.saving = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  editVehicle(vehicle: Vehicle): void {
    this.editingId = vehicle.id;
    this.form = {
      registration: vehicle.registration,
      engine: vehicle.engine,
      category: vehicle.category,
      clientId: vehicle.client?.id ?? '',
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = this.emptyForm();
  }

  deleteVehicle(vehicle: Vehicle): void {
    if (!window.confirm(`Tem a certeza de que pretende remover o veículo ${vehicle.registration}?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.vehicleService.deleteVehicle(vehicle.id).subscribe({
      next: () => {
        this.vehicles = this.vehicles.filter((item) => item.id !== vehicle.id);
        if (this.editingId === vehicle.id) {
          this.cancelEdit();
        }
        this.successMessage = 'Veículo removido com sucesso.';
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Não foi possível remover o veículo. Tente novamente.';
        this.changeDetector.markForCheck();
      },
    });
  }

  engineLabel(engine: VehicleEngine): string {
    return this.engines.find((option) => option.value === engine)?.label ?? engine;
  }

  private emptyForm(): VehicleInput {
    return {
      registration: '',
      engine: 'diesel',
      category: 'commercial_3_seats',
      clientId: this.activeClientId,
    };
  }
}
