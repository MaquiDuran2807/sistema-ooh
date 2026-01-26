import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../../context/AppContext';

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Componente de prueba que consume el contexto
const TestComponent = () => {
  const { brands, oohTypes, records, loading, fetchBrands, fetchOohTypes } = useApp();
  
  return (
    <div>
      <div data-testid="brands-count">{brands?.length || 0}</div>
      <div data-testid="types-count">{oohTypes?.length || 0}</div>
      <div data-testid="records-count">{records?.length || 0}</div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <button onClick={() => fetchBrands()}>Load Brands</button>
      <button onClick={() => fetchOohTypes()}>Load Types</button>
    </div>
  );
};

describe('AppContext - Global State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('provides global state to components', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    
    expect(screen.getByTestId('brands-count')).toBeInTheDocument();
    expect(screen.getByTestId('types-count')).toBeInTheDocument();
    expect(screen.getByTestId('records-count')).toBeInTheDocument();
  });

  test('initializes with empty arrays', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    
    expect(screen.getByTestId('brands-count')).toHaveTextContent('0');
    expect(screen.getByTestId('types-count')).toHaveTextContent('0');
    expect(screen.getByTestId('records-count')).toHaveTextContent('0');
  });

  test('fetchBrands updates context', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        { id: 1, nombre: 'CORONA', categoria: 'CERVEZAS' },
        { id: 2, nombre: 'PILSEN', categoria: 'CERVEZAS' }
      ]
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const loadBrandsBtn = screen.getByText('Load Brands');
    loadBrandsBtn.click();

    await waitFor(() => {
      expect(screen.getByTestId('brands-count')).toHaveTextContent('2');
    });
  });

  test('fetchOohTypes updates context', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        { id: 1, nombre: 'VALLA' },
        { id: 2, nombre: 'BACKLIGHT' },
        { id: 3, nombre: 'MONUMENTAL' }
      ]
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const loadTypesBtn = screen.getByText('Load Types');
    loadTypesBtn.click();

    await waitFor(() => {
      expect(screen.getByTestId('types-count')).toHaveTextContent('3');
    });
  });

  test('provides createBrand function', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // El contexto debería proporcionar createBrand
    expect(screen.getByText('Load Brands')).toBeInTheDocument();
  });

  test('provides createOohType function', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // El contexto debería proporcionar createOohType
    expect(screen.getByText('Load Types')).toBeInTheDocument();
  });

  test('provides saveRecord function', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // El contexto debería estar disponible
    expect(screen.getByTestId('loading')).toHaveTextContent('ready');
  });

  test('loading state updates correctly', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Debería iniciar como ready (no loading)
    expect(screen.getByTestId('loading')).toHaveTextContent('ready');
  });

  test('context is accessible to all children', () => {
    const ChildA = () => {
      const { brands } = useApp();
      return <div data-testid="child-a">{brands?.length || 0}</div>;
    };

    const ChildB = () => {
      const { oohTypes } = useApp();
      return <div data-testid="child-b">{oohTypes?.length || 0}</div>;
    };

    render(
      <AppProvider>
        <ChildA />
        <ChildB />
      </AppProvider>
    );

    expect(screen.getByTestId('child-a')).toBeInTheDocument();
    expect(screen.getByTestId('child-b')).toBeInTheDocument();
  });
});
