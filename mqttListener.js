const { connectMQTT, subscribe, onMessage } = require('./mqtt');

const orders = require('./orderStore'); // or same file export

connectMQTT();
subscribe('HB/ALL'); // listen to all machines

onMessage((topic, message) => {
  console.log('MQTT RX:', topic, message);

  // Expected: *machineId,txnId,amount#
  if (!message.startsWith('*') || !message.endsWith('#')) return;
  console.log('Processing message:', message);
  const payload = message.slice(1, -1); // remove * and #
  const [machineId, txn_id, amountReceived] = payload.split(',');

  if (!orders[txn_id]) {
    console.warn('Unknown txn:', txn_id);
    return;
  }

  orders[txn_id].status = 'SUCCESS';

  transactions[txn_id] = {
    txn_id,
    machineId,
    amountReceived: Number(amountReceived),
    status: 'SUCCESS',
    completedAt: new Date(),
  };

  console.log('Order SUCCESS:', txn_id);
});
