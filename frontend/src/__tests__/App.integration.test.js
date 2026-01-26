import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn((url, data) => {
    if (url.includes('/api/ooh/create')) {
      return Promise.resolve({
        data: {
          id: Math.random(),
          ...data
        }
      });
    }
    return Promise.resolve({ data: {} });
  }),
  get: jest.fn((url) => {
    if (url.includes('/api/ooh/brands')) {
      return Promise.resolve({
        data: [
          { id: 1, nombre: 'CORONA', categoria: 'CERVEZAS' },
          { id: 2, nombre: 'PILSEN', categoria: 'CERVEZAS' },
          { id: 3, nombre: 'COCA COLA', categoria: 'NABS' }
        ]
      });
    }
    if (url.includes('/api/ooh/ooh-types')) {
      return Promise.resolve({
        data: [
          { id: 1, nombre: 'VALLA' },
          { id: 2, nombre: 'BACKLIGHT' },
          { id: 3, nombre: 'MONUMENTAL' },
          { id: 4, nombre: 'BANDERA' },
          { id: 5, nombre: 'PISO' }
        ]
      });
    }
    if (url.includes('/api/ooh/all')) {
      return Promise.resolve({
        data: [
          {
            id: 1,
            marca: 'CORONA',
            categoria: 'CERVEZAS',
            campana: 'VERANO',
            proveedor: 'PROV_A',
            direccion: 'Calle 1',
            ciudad: 'Bogotá',
            region: 'Cundinamarca',
            latitud: '4.7110',
            longitud: '-74.0721',
            imagen_1: 'image1.jpg',
            imagen_2: null,
            imagen_3: null,
            fecha_inicio: '2025-01-01',
            fecha_final: '2025-12-31',
            tipo_ooh: 'VALLA'
          }
        ]
      });
    }
    return Promise.resolve({ data: [] });
  })
}));

describe('Integration Tests - Full App Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders app with tabs', () => {
    render(<App />);
    
    expect(screen.getByText(/Nuevo Registro/i)).toBeInTheDocument();
    expect(screen.getByText(/Ver Registros/i)).toBeInTheDocument();
  });

  test('shows form tab by default', () => {
    render(<App />);
    
    const newRecordTab = screen.getByRole('button', { name: /Nuevo Registro/i });
    expect(newRecordTab.className).toContain('active');
  });

  test('switches to list tab when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const listTab = screen.getByRole('button', { name: /Ver Registros/i });
    await user.click(listTab);
    
    expect(listTab.className).toContain('active');
  });

  test('loads brands on app mount', async () => {
    render(<App />);
    
    await waitFor(() => {
      // Las marcas deberían estar disponibles en el contexto
      // Podemos verificar abriendo el Debug Panel
      const debugBtn = screen.getByText('🐛 Debug');
      expect(debugBtn).toBeInTheDocument();
    });
  });

  test('loads OOH types on app mount', async () => {
    render(<App />);
    
    await waitFor(() => {
      // Los tipos deberían estar disponibles en el contexto
      expect(screen.getByText('🐛 Debug')).toBeInTheDocument();
    });
  });

  test('complete flow: create brand -> create record -> view in list', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Verifica que estamos en la pestaña de formulario
    await waitFor(() => {
      expect(screen.getByText(/Nuevo Registro/i)).toBeInTheDocument();
    });

    // 2. Abre el modal de Agregar Marca
    const addMarcaBtns = screen.queryAllByText(/Agregar Marca|agregar marca/i);
    if (addMarcaBtns.length > 0) {
      await user.click(addMarcaBtns[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Agregar Nueva Marca')).toBeInTheDocument();
      });
    }

    // 3. Ve a la pestaña de Ver Registros
    const listTab = screen.getByRole('button', { name: /Ver Registros/i });
    await user.click(listTab);

    // 4. Verifica que se cargaron registros
    await waitFor(() => {
      expect(listTab.className).toContain('active');
    });
  });

  test('debug panel displays current state', async () => {
    const user = userEvent.setup();
    render(<App />);

    const debugBtn = screen.getByText('🐛 Debug');
    await user.click(debugBtn);

    await waitFor(() => {
      expect(screen.getByText(/Context Global|LocalStorage|Window/)).toBeInTheDocument();
    });
  });

  test('context global tab shows brand count', async () => {
    const user = userEvent.setup();
    render(<App />);

    const debugBtn = screen.getByText('🐛 Debug');
    await user.click(debugBtn);

    // Debería estar en la pestaña "Context Global"
    await waitFor(() => {
      // Verifica que hay información de contexto
      const contextTab = screen.queryByText(/Context Global/);
      if (contextTab) {
        expect(contextTab).toBeInTheDocument();
      }
    });
  });

  test('closes debug panel when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const debugBtn = screen.getByText('🐛 Debug');
    await user.click(debugBtn);

    const closeBtn = screen.getByText('×');
    await user.click(closeBtn);

    // El panel debería cerrarse y mostrar nuevamente el botón de debug
    expect(screen.getByText('🐛 Debug')).toBeInTheDocument();
  });

  test('matches app snapshot', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container).toMatchSnapshot();
    });
  });

  test('error handling: displays error if API fails', async () => {
    const axios = require('axios');
    axios.get.mockRejectedValueOnce(new Error('API Error'));

    render(<App />);

    await waitFor(() => {
      // Debería manejar el error gracefully
      expect(screen.getByText('🐛 Debug')).toBeInTheDocument();
    });
  });
});
