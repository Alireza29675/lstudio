import React from 'react'
import ReactDOM from 'react-dom/client'
import { getWebOutput } from '@projects/hightechmess'
import './styles.css'

(async () => {
  const output = await getWebOutput();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {output}
    </React.StrictMode>,
  )
})()