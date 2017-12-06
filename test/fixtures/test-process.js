const {fork} = require('child_process')
let childProcess = null

function callCommand (command, params) {
  let replyCommand = `${command}:reply`
  return new Promise((resolve, reject) => {
    function onMessage (message) {
      let reply = null
      try {
        reply = JSON.parse(message)
      } catch (e) {
        reject(e)
        return
      }
      let {command, data} = reply
      if (command !== replyCommand) {
        return
      }
      childProcess.removeListener('message', onMessage)
      resolve(data)
    }

    childProcess.on('message', onMessage)
    childProcess.send(command, JSON.stringify(params))
  })
}

module.exports = (programPath, parameters = []) => {
  childProcess = fork(programPath, parameters, {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  })

  return {
    callCommand
  }
}
