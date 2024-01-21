import React from 'react'
import ReactDOM from 'react-dom/client'
import { LStudioClientAPI } from "@lstudio/core"

const client = new LStudioClientAPI(
  {
    play: () => {
      console.log("Hello World")
    },
    switchMode: () => {}
  },
  {},
  {}
)

client.controls.play()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div>Hello World</div>
  </React.StrictMode>,
)
