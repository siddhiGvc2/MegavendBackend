const mqtt = require('mqtt');
const EventEmitter = require('events');
const fs=require('fs');

const MQTT_BROKER_URL = 'mqtts://megavend.in';
const MQTT_USERNAME= 'megavend';
const MQTT_PASSWORD = 'megavend@123';

const MQTT_TOPIC = 'HB/ALL';

const caCert = fs.readFileSync('./ca.crt');


const mqttEvents = new EventEmitter();
let mqttClient = null;
let messageHandler = null;

/**
 * Connect to MQTT broker (call from any file)
 */
function connectMQTT() {
  if (mqttClient && mqttClient.connected) {
    console.log('MQTT already connected');
    return mqttClient;
  }

  mqttClient = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      ca: caCert,
      protocol: 'mqtts',
      rejectUnauthorized: true, // IMPORTANT
      keepalive: 60,
      reconnectPeriod: 5000,
    });


  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    subscribe(MQTT_TOPIC); // Example subscription
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT error:', err);
  });

  mqttClient.on('message', (topic, message) => {
    // console.log(`Received from ${topic}:`, message.toString());
     mqttEvents.emit('message', topic, message.toString());
  });

  return mqttClient;
}

/**
 * Subscribe to topic
 */
function subscribe(topic) {
  if (!mqttClient || !mqttClient.connected) {
    console.error('MQTT not connected');
    return;
  }

  mqttClient.subscribe(topic, (err) => {
    if (err) {
      console.error('Subscribe error:', err);
    } else {
      console.log(`Subscribed to ${topic}`);
    }
  });
}

/**
 * Publish message
 */
function sendMessage(topic, payload) {
  if (!mqttClient || !mqttClient.connected) {
    console.error('MQTT not connected. Call connectMQTT() first.');
    return;
  }

  const message =
    typeof payload === 'string' ? payload : JSON.stringify(payload);

  mqttClient.publish(topic, message, { qos: 1 }, (err) => {
    if (err) {
      console.error('Publish error:', err);
    } else {
      console.log(`Published to ${topic}:`, message);
    }
  });
}


/**
 * Disconnect MQTT
 */
function disconnectMQTT() {
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
    console.log('MQTT disconnected');
  }
}

module.exports = {
  connectMQTT,
  subscribe,
  sendMessage,
  disconnectMQTT,
  mqttEvents
};
