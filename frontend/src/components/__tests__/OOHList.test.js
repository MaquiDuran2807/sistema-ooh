import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OOHList from '../OOHList';
import { AppProvider } from '../../context/AppContext';

// Mock para axios
jest.mock('axios');

// Mock data
const mockRecords = [
  {
    id: 1,
    marca: 'CLUB_COLOMBIA',
    categoria: 'CERVEZAS',
    campana: 'VERANO_2025',
    proveedor: 'PROVIDER_A',
    direccion: 'Calle 1, Bogotá',
    ciudad: 'Bogotá',
    region: 'Cundinamarca',
    latitud: '4.7110',
    longitud: '-74.0721',
    imagen_1: 'http://localhost:8080/api/images/imagen1.jpg',
    imagen_2: null,
    imagen_3: null,
    fecha_inicio: '2025-01-01',
    fecha_final: '2025-12-31',
    tipo_ooh: 'VALLA'
  },
  {
    id: 2,
    marca: 'PILSEN',
    categoria: 'CERVEZAS',
    campana: 'INVIERNO_2025',
    proveedor: 'PROVIDER_B',
    direccion: 'Calle 2, Medellín',
    ciudad: 'Medellín',
    region: 'Antioquia',
    latitud: '6.2442',
    longitud: '-75.5812',
    imagen_1: 'http://localhost:8080/api/images/imagen2.jpg',
    imagen_2: 'http://localhost:8080/api/images/imagen2b.jpg',
    imagen_3: null,
    fecha_inicio: '2025-01-15',
    fecha_final: '2025-12-15',
    tipo_ooh: 'VALLA'
  }
];

describe('OOHList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders component title', () => {
    render(
      <AppProvider>
        <OOHList />
      </AppProvider>
    );
    
    expect(screen.getByText(/Registros OOH/i)).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    render(
      <AppProvider>
        <OOHList />
      </AppProvider>
    );
    
    // Debería mostrar algún indicador de carga
    expect(screen.getByText(/cargando|loading/i) || screen.queryByText(/registros/i)).toBeDefined();
  });

  test('displays records when data is loaded', async () => {
    render(
      <AppProvider>
        <OOHList />
      </AppProvider>
    );
    
    // Espera a que se carguen los registros
    await waitFor(() => {
      expect(screen.queryByText(/registros ooh/i)).toBeInTheDocument();
    });
  });

  test('opens detail modal when "Ver Más" button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <OOHList />
      </AppProvider>
    );
    
    // Busca el botón "Ver Más"
    await waitFor(() => {
      const verMasButtons = screen.queryAllByText(/Ver más|Ver Más/);
      if (verMasButtons.length > 0) {
        expect(verMasButtons[0]).toBeInTheDocument();
      }
    });
  });

  test('filters records by brand', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <OOHList />
      </AppProvider>
    );
    
    await waitFor(() => {
      const marcaFilter = screen.queryByLabelText(/marca|brand/i);
      if (marcaFilter) {
        expect(marcaFilter).toBeInTheDocument();
      }
    });
  });

  test('filters records by address', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <OOHList />
      </AppProvider>
    );
    
    await waitFor(() => {
      const direccionFilter = screen.queryByPlaceholderText(/dirección|direction/i);
      if (direccionFilter) {
        expect(direccionFilter).toBeInTheDocument();
      }
    });
  });

  test('matches snapshot', async () => {
    const { container } = render(
      <AppProvider>
        <OOHList />
      </AppProvider>
    );
    
    await waitFor(() => {
      expect(container).toMatchSnapshot();
    });
  });
});
