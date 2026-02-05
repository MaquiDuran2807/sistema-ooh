import React, { useState, useEffect } from 'react';
import './App.css';
import OOHForm from './components/OOHForm';
import OOHList from './components/OOHList';
import DebugPanel from './components/DebugPanel';
import { AppProvider, useApp } from './context/AppContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState('form');
  const [refreshList, setRefreshList] = useState(false);
  const { initializeApp, loading, initialized } = useApp();

  // Inicializar app al montar
  useEffect(() => {
    if (!initialized) {
      initializeApp();
    }
  }, [initialized, initializeApp]);

  const handleFormSuccess = () => {
    setRefreshList(!refreshList);
    setActiveTab('list');
  };

  if (loading && !initialized) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>🏢 Gestión OOH - Out of Home</h1>
        </header>
        <div className="tab-content">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Cargando datos maestros...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏢 Gestión OOH - Out of Home</h1>
        <p>Sistema de gestión de campañas publicitarias en espacios exteriores</p>
      </header>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          📝 Nuevo Registro
        </button>
        <button
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Ver Registros
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'form' && <OOHForm onSuccess={handleFormSuccess} />}
        {activeTab === 'list' && <OOHList refreshTrigger={refreshList} />}
      </div>

      <DebugPanel />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
