import React, { useState } from 'react';
import './App.css';
import OOHForm from './components/OOHForm';
import OOHList from './components/OOHList';
import DebugPanel from './components/DebugPanel';
import { AppProvider } from './context/AppContext';

function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [refreshList, setRefreshList] = useState(false);

  const handleFormSuccess = () => {
    setRefreshList(!refreshList);
    setActiveTab('list');
  };

  return (
    <AppProvider>
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
          {activeTab === 'list' && <OOHList key={refreshList} />}
        </div>

        <DebugPanel />
      </div>
    </AppProvider>
  );
}

export default App;
