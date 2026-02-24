import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import './DebugPanel.css';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('context'); // 'context', 'localStorage', 'window'
  
  const appContext = useApp();

  const getContextInfo = () => {
    return {
      brands: appContext.brands || [],
      campaigns: appContext.campaigns || [],
      categories: appContext.categories || [],
      advertisers: appContext.advertisers || [],
      oohTypes: appContext.oohTypes || [],
      cities: appContext.cities || [],
      addresses: appContext.addresses || [],
      providers: appContext.providers || [],
      regions: appContext.regions || [],
      records: appContext.records || [],
      loading: appContext.loading,
      initialized: appContext.initialized,
      brandsCount: appContext.brands?.length || 0,
      campaignsCount: appContext.campaigns?.length || 0,
      categoriesCount: appContext.categories?.length || 0,
      advertisersCount: appContext.advertisers?.length || 0,
      oohTypesCount: appContext.oohTypes?.length || 0,
      citiesCount: appContext.cities?.length || 0,
      addressesCount: appContext.addresses?.length || 0,
      providersCount: appContext.providers?.length || 0,
      regionsCount: appContext.regions?.length || 0,
      recordsCount: appContext.records?.length || 0,
    };
  };

  const getLocalStorageInfo = () => {
    const info = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        const value = localStorage.getItem(key);
        info[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
      } catch (e) {
        info[key] = '[Error reading]';
      }
    }
    return info;
  };

  const renderJSON = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  if (!isOpen) {
    return (
      <button 
        className="debug-toggle"
        onClick={() => setIsOpen(true)}
        title="Abrir panel de debug"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>🐛 Debug Panel</h3>
        <button className="debug-close" onClick={() => setIsOpen(false)}>×</button>
      </div>

      <div className="debug-tabs">
        <button 
          className={`tab ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          Context Global
        </button>
        <button 
          className={`tab ${activeTab === 'localStorage' ? 'active' : ''}`}
          onClick={() => setActiveTab('localStorage')}
        >
          LocalStorage
        </button>
        <button 
          className={`tab ${activeTab === 'window' ? 'active' : ''}`}
          onClick={() => setActiveTab('window')}
        >
          Window
        </button>
      </div>

      <div className="debug-content">
        {activeTab === 'context' && (
          <div>
            <h4>AppContext</h4>
            <div className="debug-summary">
              <p>📦 Brands: {getContextInfo().brandsCount}</p>
              <p>📋 Campaigns: {getContextInfo().campaignsCount}</p>
              <p>🏷️ Categories: {getContextInfo().categoriesCount}</p>
              <p>🏢 Advertisers: {getContextInfo().advertisersCount}</p>
              <p>🚀 OOH Types: {getContextInfo().oohTypesCount}</p>
              <p>🏙️ Cities: {getContextInfo().citiesCount}</p>
              <p>📍 Addresses: {getContextInfo().addressesCount}</p>
              <p>🏭 Providers: {getContextInfo().providersCount}</p>
              <p>🗺️ Regions: {getContextInfo().regionsCount}</p>
              <p>📊 Records: {getContextInfo().recordsCount}</p>
              <p>⏳ Loading: {String(getContextInfo().loading)}</p>
              <p>✅ Initialized: {String(getContextInfo().initialized)}</p>
            </div>
            <details>
              <summary>Ver detalles completos</summary>
              <pre>{renderJSON(getContextInfo())}</pre>
            </details>
          </div>
        )}

        {activeTab === 'localStorage' && (
          <div>
            <h4>LocalStorage</h4>
            {Object.keys(getLocalStorageInfo()).length === 0 ? (
              <p>LocalStorage vacío</p>
            ) : (
              <pre>{renderJSON(getLocalStorageInfo())}</pre>
            )}
          </div>
        )}

        {activeTab === 'window' && (
          <div>
            <h4>Window Object</h4>
            <div className="debug-summary">
              <p>API URL: {window.API_URL || 'No configurada'}</p>
              <p>Hostname: {window.location.hostname}</p>
              <p>Port: {window.location.port}</p>
              <p>Protocol: {window.location.protocol}</p>
            </div>
            {window.API_URL && (
              <button 
                className="debug-btn"
                onClick={() => {
                  fetch(`${window.API_URL}/api/ooh/all`)
                    .then(r => r.json())
                    .then(d => console.log('✅ API Test:', d))
                    .catch(e => console.error('❌ API Error:', e));
                }}
              >
                🔗 Test API /api/ooh/all
              </button>
            )}
          </div>
        )}
      </div>

      <div className="debug-footer">
        <small>Panel de debug - datos en tiempo real</small>
      </div>
    </div>
  );
};

export default DebugPanel;
