const isLogged = async (logEntries, eventName) => {
    console.log(`log entries: ${logEntries}`);
    let event = logEntries.find(event => {
        console.log(`event: ${event}. Name: ${event.event}`);
        return event.event === eventName
    });
    assert.exists(event);
    return event;
};


const isInTransaction = async (transaction, eventName) => {
    let { logs } = await transaction;
    return isLogged(logs, eventName);
};


module.exports = {
    isLogged,
    isInTransaction
};