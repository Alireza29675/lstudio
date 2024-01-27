import React from 'react'
import ReactDOM from 'react-dom/client'
import { output } from '@projects/hightechmess'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {output}
  </React.StrictMode>,
)
