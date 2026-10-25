import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { Client, ClientInput } from '../models/client.model';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly apiUrl = 'http://localhost:3000/clients';
  private readonly clientsSubject = new BehaviorSubject<Client[]>([]);
  private readonly activeClientIdSubject = new BehaviorSubject<string>('');
  private clientsRevision = 0;
  readonly clients$ = this.clientsSubject.asObservable();
  readonly activeClientId$ = this.activeClientIdSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  getClients(): Observable<Client[]> {
    const requestedRevision = this.clientsRevision;
    return this.http.get<Client[]>(this.apiUrl, {
      headers: { 'Cache-Control': 'no-cache' },
    }).pipe(map((clients) => {
      if (requestedRevision !== this.clientsRevision) {
        return this.clientsSubject.value;
      }

      this.clientsSubject.next(clients);
      const activeClientId = this.activeClientIdSubject.value;
      if (!clients.some((client) => client.id === activeClientId)) {
        const savedClientId = typeof localStorage === 'undefined'
          ? ''
          : localStorage.getItem('contabilistia.activeClientId') ?? '';
        const defaultClientId = clients.some((client) => client.id === savedClientId)
          ? savedClientId
          : clients[0]?.id ?? '';
        this.setActiveClient(defaultClientId);
      }
      return clients;
    }));
  }

  createClient(client: ClientInput): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client).pipe(map((response) => {
      const createdClient = { ...client, ...response };
      if (!createdClient.id) {
        throw new Error('A API não devolveu o identificador do cliente criado.');
      }

      this.clientsRevision += 1;
      const clients = this.clientsSubject.value.filter((item) => item.id !== createdClient.id);
      this.clientsSubject.next([...clients, createdClient]
        .sort((first, second) => first.name.localeCompare(second.name, 'pt')));
      if (!this.activeClientIdSubject.value) {
        this.setActiveClient(createdClient.id);
      }
      return createdClient;
    }));
  }

  updateClient(id: string, client: ClientInput): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}/${id}`, client).pipe(map((response) => {
      const updatedClient = { ...client, ...response };
      if (!updatedClient.id) {
        throw new Error('A API não devolveu o identificador do cliente atualizado.');
      }

      this.clientsRevision += 1;
      this.clientsSubject.next(this.clientsSubject.value
        .map((item) => item.id === updatedClient.id ? updatedClient : item)
        .sort((first, second) => first.name.localeCompare(second.name, 'pt')));
      return updatedClient;
    }));
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(tap(() => {
      this.clientsRevision += 1;
      const clients = this.clientsSubject.value.filter((client) => client.id !== id);
      this.clientsSubject.next(clients);
      if (this.activeClientIdSubject.value === id) {
        this.setActiveClient(clients[0]?.id ?? '');
      }
    }));
  }

  setActiveClient(clientId: string): void {
    const exists = this.clientsSubject.value.some((client) => client.id === clientId);
    const selectedClientId = exists ? clientId : '';
    this.activeClientIdSubject.next(selectedClientId);
    if (typeof localStorage !== 'undefined') {
      if (selectedClientId) {
        localStorage.setItem('contabilistia.activeClientId', selectedClientId);
      } else {
        localStorage.removeItem('contabilistia.activeClientId');
      }
    }
  }
}
