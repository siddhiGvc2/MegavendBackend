const { mqttEvents, sendMessage } = require('./mqtt');
const {orders,deviceStatus} = require('./orderStore');

mqttEvents.on('message', (topic, message) => {
  console.log('MQTT RX:', topic, message);

  // *machineId,txnId,amount#
  if (!message.startsWith('*') || !message.endsWith('#')) return;

  const payload = message.slice(1, -1);
  const [machineId, txn_id, amountReceived] = payload.split(',');
   if(machineId){
    deviceStatus[machineId] = new Date().toISOString();
  }
  if(amountReceived=="AmountReceived"){
  console.log('Parsed MQTT message:', { machineId, txn_id, amountReceived });
  console.log('Current', orders);
   if(machineId){
    deviceStatus[machineId] = new Date().toISOString();
  }
  if (!orders[txn_id]) return;
  if(orders[txn_id].status === 'SUCCESS') return;

  orders[txn_id].status = 'SUCCESS';
  console.log(`Order ${txn_id} updated to SUCCESS`);
//   console.log('Updated Order:', orders[txn_id]);
  sendMessage(`HB/${machineId}`, `*SUCCESS#`);
// build kbd values based on items length
const kbds = orders[txn_id].items.map(item => `${item.x}${item.y}`);

// join with comma
const kbdString = kbds.join(',');

sendMessage(
  `HB/${machineId}`,
  `*KBDK${txn_id},${kbdString}#`
);
  }
});
