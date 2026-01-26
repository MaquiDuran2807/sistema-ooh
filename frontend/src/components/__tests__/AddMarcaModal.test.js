import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddMarcaModal from '../AddMarcaModal';
import { AppProvider } from '../../context/AppContext';

// Mock para axios
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({ data: { id: 1, nombre: 'CORONA' } })),
  get: jest.fn(() => Promise.resolve({ 
    data: [
      { id: 1, nombre: 'COLA CERO', categoria: 'NABS' },
      { id: 2, nombre: 'PILSEN', categoria: 'CERVEZAS' }
    ]
  }))
}));

const mockOnClose = jest.fn();
const mockOnAdd = jest.fn();

describe('AddMarcaModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal when isOpen is true', () => {
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    expect(screen.getByText('Agregar Nueva Marca')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la Marca *')).toBeInTheDocument();
  });

  test('does not render modal when isOpen is false', () => {
    render(
      <AppProvider>
        <AddMarcaModal isOpen={false} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    expect(screen.queryByText('Agregar Nueva Marca')).not.toBeInTheDocument();
  });

  test('displays brand count when modal opens', async () => {
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Marcas existentes:/)).toBeInTheDocument();
    });
  });

  test('allows user to input brand name', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    const input = screen.getByPlaceholderText('Ej: NUEVA MARCA');
    await user.type(input, 'CORONA');
    
    expect(input.value).toBe('CORONA');
  });

  test('allows user to select category', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    const select = screen.getByDisplayValue('-- Seleccionar --');
    await user.selectOptions(select, 'CERVEZAS');
    
    expect(select.value).toBe('CERVEZAS');
  });

  test('shows error when brand name is empty', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    const submitBtn = screen.getByText('Agregar Marca');
    await user.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByText('El nombre de la marca es obligatorio')).toBeInTheDocument();
    });
  });

  test('shows error when category is not selected', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    const input = screen.getByPlaceholderText('Ej: NUEVA MARCA');
    await user.type(input, 'CORONA');
    
    const submitBtn = screen.getByText('Agregar Marca');
    await user.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Debes seleccionar una categoría')).toBeInTheDocument();
    });
  });

  test('calls onAdd with correct data when form is submitted', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    const nameInput = screen.getByPlaceholderText('Ej: NUEVA MARCA');
    const categorySelect = screen.getByDisplayValue('-- Seleccionar --');
    const submitBtn = screen.getByText('Agregar Marca');
    
    await user.type(nameInput, 'CORONA');
    await user.selectOptions(categorySelect, 'CERVEZAS');
    await user.click(submitBtn);
    
    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({
        nombre: 'CORONA',
        categoria: 'CERVEZAS',
        campanas: []
      });
    });
  });

  test('closes modal after successful submission', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    const nameInput = screen.getByPlaceholderText('Ej: NUEVA MARCA');
    const categorySelect = screen.getByDisplayValue('-- Seleccionar --');
    const submitBtn = screen.getByText('Agregar Marca');
    
    await user.type(nameInput, 'CORONA');
    await user.selectOptions(categorySelect, 'CERVEZAS');
    await user.click(submitBtn);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  test('clears form when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    const nameInput = screen.getByPlaceholderText('Ej: NUEVA MARCA');
    await user.type(nameInput, 'CORONA');
    
    const cancelBtn = screen.getByText('Cancelar');
    await user.click(cancelBtn);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('debug button toggles debug panel', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <AddMarcaModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      </AppProvider>
    );
    
    const debugBtn = screen.getByText('🔍 Debug');
    await user.click(debugBtn);
    
    expect(screen.getByText(/Estado del Modal:/)).toBeInTheDocument();
  });
});
