export const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function connect(port) {
  let socket;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find(target => target.type === 'page');
      if (!page) throw new Error('没有可用页面');
      socket = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => {
        socket.onopen = resolve;
        socket.onerror = reject;
      });
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('无法连接 Chrome DevTools Protocol');

  let requestId = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(message.error);
      else request.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown' || message.method === 'Log.entryAdded') {
      errors.push(message.params);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  return {
    socket,
    send,
    evaluate,
    errors,
    close: () => socket.close(),
  };
}

export function assertAll(assertions, report) {
  const failed = assertions.filter(assertion => !assertion.ok).map(assertion => assertion.label);
  console.log(JSON.stringify(report, null, 2));
  if (failed.length) throw new Error(`验收失败：\n- ${failed.join('\n- ')}`);
}
