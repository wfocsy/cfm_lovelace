/**
 * CFM Manager Card - Main Class
 *
 * Version: v2.0.0
 * State Machine: PRE-START → ACTIVE CYCLE → CLOSED
 */

class CfmManagerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._currentState = 'UNKNOWN';
  }

  /**
   * Set card configuration from Lovelace UI
   * @param {Object} config - Card configuration
   */
  setConfig(config) {
    if (!config.manager_id) {
      throw new Error('manager_id is required in configuration');
    }

    this._config = {
      manager_id: config.manager_id,
      daily_save_time: config.daily_save_time || '07:00',
      show_notifications: config.show_notifications !== false,
      show_debug: config.show_debug || false
    };

    this._render();
  }

  /**
   * HA passes hass object to card
   * @param {Object} hass - Home Assistant object
   */
  set hass(hass) {
    this._hass = hass;
    this._updateState();
    this._render();
  }

  /**
   * State machine - Detect current cycle state
   * @returns {string} - Current state (PRE-START, ACTIVE, CLOSED, UNKNOWN)
   */
  _updateState() {
    if (!this._hass || !this._config.manager_id) {
      this._currentState = 'UNKNOWN';
      return;
    }

    const managerId = this._config.manager_id;
    const statusSensor = `sensor.manager_${managerId}_cycle_status`;
    const statusEntity = this._hass.states[statusSensor];

    if (!statusEntity) {
      console.warn(`[CFM Card] Sensor not found: ${statusSensor}`);
      this._currentState = 'UNKNOWN';
      return;
    }

    const status = statusEntity.state;

    // State machine logic
    if (status === 'waiting' || status === 'idle') {
      this._currentState = 'PRE-START';
    } else if (status === 'active' || status === 'running') {
      this._currentState = 'ACTIVE';
    } else if (status === 'completed' || status === 'closed') {
      this._currentState = 'CLOSED';
    } else {
      this._currentState = 'UNKNOWN';
    }

    if (this._config.show_debug) {
      console.log(`[CFM Card] State: ${this._currentState}, Status: ${status}`);
    }
  }

  /**
   * Get sensor value from Home Assistant
   * @param {string} entity_id - Sensor entity ID
   * @returns {string|null} - Sensor value or null
   */
  _getSensorValue(entity_id) {
    if (!this._hass || !entity_id) return null;

    const entity = this._hass.states[entity_id];
    return entity ? entity.state : null;
  }

  /**
   * Get sensor attribute from Home Assistant
   * @param {string} entity_id - Sensor entity ID
   * @param {string} attribute - Attribute name
   * @returns {any} - Attribute value or null
   */
  _getSensorAttribute(entity_id, attribute) {
    if (!this._hass || !entity_id) return null;

    const entity = this._hass.states[entity_id];
    return entity && entity.attributes ? entity.attributes[attribute] : null;
  }

  /**
   * Render card based on current state
   */
  _render() {
    if (!this.shadowRoot) return;

    const managerId = this._config.manager_id;

    // Get manager name from sensor attribute
    const managerNameSensor = `sensor.manager_${managerId}_cycle_status`;
    const managerName = this._getSensorAttribute(managerNameSensor, 'manager_name') || `Manager ${managerId}`;

    // Render based on state
    let content = '';

    switch (this._currentState) {
      case 'PRE-START':
        content = this._renderPreStart(managerName);
        break;
      case 'ACTIVE':
        content = this._renderActiveCycle(managerName);
        break;
      case 'CLOSED':
        content = this._renderClosedCycle(managerName);
        break;
      case 'UNKNOWN':
      default:
        content = this._renderUnknown(managerName);
        break;
    }

    this.shadowRoot.innerHTML = `
      <style>
        ${this._getStyles()}
      </style>
      <ha-card>
        ${content}
      </ha-card>
    `;
  }

  /**
   * Render PRE-START state (Várakozó)
   */
  _renderPreStart(managerName) {
    return `
      <div class="card-content pre-start">
        <div class="header">
          <h2>${managerName}</h2>
          <div class="status waiting">Várakozik ciklus indításra</div>
        </div>

        <div class="action-buttons">
          <button class="primary-button" onclick="this.getRootNode().host._handleStartCycle()">
            🐔 CIKLUS INDÍTÁS
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render ACTIVE CYCLE state (Futó ciklus)
   */
  _renderActiveCycle(managerName) {
    const managerId = this._config.manager_id;

    // Get cycle data from sensors
    const cycleId = this._getSensorValue(`sensor.manager_${managerId}_current_cycle_id`);
    const cycleDay = this._getSensorValue(`sensor.manager_${managerId}_cycle_day`);
    const currentStock = this._getSensorValue(`sensor.manager_${managerId}_current_stock`);
    const averageWeight = this._getSensorValue(`sensor.manager_${managerId}_average_weight`);
    const fcr = this._getSensorValue(`sensor.manager_${managerId}_fcr`);
    const dailyFeed = this._getSensorValue(`sensor.manager_${managerId}_daily_feed_consumed`);
    const totalMortality = this._getSensorValue(`sensor.manager_${managerId}_total_mortality`);
    const mortalityRate = this._getSensorValue(`sensor.manager_${managerId}_mortality_rate`);
    const breed = this._getSensorAttribute(`sensor.manager_${managerId}_cycle_status`, 'breed');

    return `
      <div class="card-content active-cycle">
        <div class="header">
          <h2>${managerName}</h2>
          <div class="cycle-id">${cycleId || 'N/A'}</div>
        </div>

        <div class="info-row">
          <div class="info-item">
            <span class="label">Kor:</span>
            <span class="value">${cycleDay || 0} nap</span>
          </div>
          <div class="info-item">
            <span class="label">Állomány:</span>
            <span class="value">${currentStock || 0} db</span>
          </div>
        </div>

        <div class="info-row">
          <span class="breed">Fajta: ${breed || 'N/A'}</span>
        </div>

        <div class="metrics">
          <div class="metric">
            <span class="metric-label">Súly</span>
            <span class="metric-value">${averageWeight || 0}g</span>
          </div>
          <div class="metric">
            <span class="metric-label">FCR</span>
            <span class="metric-value">${fcr || 'N/A'}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Takarmány</span>
            <span class="metric-value">${dailyFeed || 0}kg/nap</span>
          </div>
          <div class="metric">
            <span class="metric-label">Elhullás</span>
            <span class="metric-value">${totalMortality || 0} db (${mortalityRate || 0}%)</span>
          </div>
        </div>

        <div class="action-buttons">
          <button class="secondary-button" onclick="this.getRootNode().host._handleShipping()">
            🚚 Elszállítás
          </button>
          <button class="secondary-button" onclick="this.getRootNode().host._handleMortality()">
            💀 Elhullás
          </button>
          <button class="danger-button" onclick="this.getRootNode().host._handleCloseCycle()">
            📊 Ciklus Lezárás
          </button>
        </div>

        <div class="next-save">
          ⏰ Következő mentés: holnap ${this._config.daily_save_time}
        </div>
      </div>
    `;
  }

  /**
   * Render CLOSED CYCLE state (Lezárt ciklus)
   */
  _renderClosedCycle(managerName) {
    const managerId = this._config.manager_id;

    // Get final cycle data
    const cycleId = this._getSensorValue(`sensor.manager_${managerId}_last_cycle_id`);
    const duration = this._getSensorValue(`sensor.manager_${managerId}_last_cycle_duration`);
    const finalStock = this._getSensorValue(`sensor.manager_${managerId}_last_final_stock`);
    const finalWeight = this._getSensorValue(`sensor.manager_${managerId}_last_final_weight`);
    const finalFcr = this._getSensorValue(`sensor.manager_${managerId}_last_final_fcr`);
    const totalShipped = this._getSensorValue(`sensor.manager_${managerId}_last_total_shipped`);
    const totalMortality = this._getSensorValue(`sensor.manager_${managerId}_last_total_mortality`);
    const mortalityRate = this._getSensorValue(`sensor.manager_${managerId}_last_mortality_rate`);

    return `
      <div class="card-content closed-cycle">
        <div class="header">
          <h2>${managerName}</h2>
          <div class="cycle-id">${cycleId || 'N/A'}</div>
          <div class="status completed">✅ Lezárt ciklus</div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <span class="label">Időtartam:</span>
            <span class="value">${duration || 0} nap</span>
          </div>
          <div class="summary-item">
            <span class="label">Végső állomány:</span>
            <span class="value">${finalStock || 0} db</span>
          </div>
          <div class="summary-item">
            <span class="label">Végső súly:</span>
            <span class="value">${finalWeight || 0}g</span>
          </div>
          <div class="summary-item">
            <span class="label">Végső FCR:</span>
            <span class="value">${finalFcr || 'N/A'}</span>
          </div>
          <div class="summary-item">
            <span class="label">Elszállítás:</span>
            <span class="value">${totalShipped || 0} db</span>
          </div>
          <div class="summary-item">
            <span class="label">Elhullás:</span>
            <span class="value">${totalMortality || 0} db (${mortalityRate || 0}%)</span>
          </div>
        </div>

        <div class="action-buttons">
          <button class="primary-button" onclick="this.getRootNode().host._handleStartCycle()">
            🐔 ÚJ CIKLUS INDÍTÁS
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render UNKNOWN state (Hibás konfiguráció)
   */
  _renderUnknown(managerName) {
    return `
      <div class="card-content unknown">
        <div class="header">
          <h2>${managerName}</h2>
          <div class="status error">❌ Ismeretlen állapot</div>
        </div>

        <div class="error-message">
          <p>Nem található sensor: sensor.manager_${this._config.manager_id}_cycle_status</p>
          <p>Ellenőrizd a konfigurációt és a szenzorok létezését!</p>
        </div>
      </div>
    `;
  }

  /**
   * Event handlers (TODO: Implement in next phase)
   */
  _handleStartCycle() {
    console.log('[CFM Card] Start Cycle clicked - TODO: Implement form');
    // TODO: Show cycle start form (Phase 2)
  }

  _handleShipping() {
    console.log('[CFM Card] Shipping clicked - TODO: Implement modal');
    // TODO: Show shipping modal (Phase 3)
  }

  _handleMortality() {
    console.log('[CFM Card] Mortality clicked - TODO: Implement modal');
    // TODO: Show mortality modal (Phase 3)
  }

  _handleCloseCycle() {
    console.log('[CFM Card] Close Cycle clicked - TODO: Implement confirm');
    // TODO: Show confirmation dialog (Phase 3)
  }

  /**
   * Get card styles (imported from card-styles.js)
   */
  _getStyles() {
    // TODO: Import from src/styles/card-styles.js
    return `
      :host {
        display: block;
      }

      ha-card {
        padding: 16px;
      }

      .card-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .header {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 14px;
        display: inline-block;
      }

      .status.waiting {
        background-color: #FFA500;
        color: white;
      }

      .status.completed {
        background-color: #4CAF50;
        color: white;
      }

      .status.error {
        background-color: #F44336;
        color: white;
      }

      .cycle-id {
        font-size: 16px;
        color: #666;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .label {
        font-size: 12px;
        color: #666;
      }

      .value {
        font-size: 16px;
        font-weight: 500;
      }

      .breed {
        font-size: 14px;
        color: #666;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .metric {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .metric-label {
        font-size: 12px;
        color: #666;
      }

      .metric-value {
        font-size: 18px;
        font-weight: 500;
      }

      .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      button {
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .primary-button {
        background-color: #4CAF50;
        color: white;
      }

      .primary-button:hover {
        background-color: #45a049;
      }

      .secondary-button {
        background-color: #2196F3;
        color: white;
      }

      .secondary-button:hover {
        background-color: #1976D2;
      }

      .danger-button {
        background-color: #F44336;
        color: white;
      }

      .danger-button:hover {
        background-color: #D32F2F;
      }

      .next-save {
        text-align: center;
        font-size: 14px;
        color: #666;
        padding: 8px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .summary {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 8px;
        border-bottom: 1px solid #eee;
      }

      .error-message {
        padding: 16px;
        background-color: #ffebee;
        border-radius: 8px;
        color: #c62828;
      }

      .error-message p {
        margin: 8px 0;
      }
    `;
  }

  /**
   * Get card stub config for Lovelace UI editor
   */
  static getStubConfig() {
    return {
      manager_id: 1,
      daily_save_time: '07:00',
      show_notifications: true,
      show_debug: false
    };
  }

  /**
   * Get card size for Lovelace layout
   */
  getCardSize() {
    // Dynamic size based on state
    switch (this._currentState) {
      case 'ACTIVE':
        return 8;  // Larger card for active cycle
      case 'CLOSED':
        return 7;  // Medium card for summary
      case 'PRE-START':
      default:
        return 3;  // Small card for waiting state
    }
  }
}

// Register custom card
customElements.define('cfm-manager-card', CfmManagerCard);

// Register card for Lovelace UI editor
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'cfm-manager-card',
  name: 'CFM Manager Card',
  description: 'Baromfi nevelési ciklus kezelő kártya',
  preview: true
});

console.log('[CFM Card] v2.0.0 - Card Main loaded successfully');
