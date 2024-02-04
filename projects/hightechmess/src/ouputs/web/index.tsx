import { Color } from "@lstudio/core"
import { ClockType, ProjectType } from "./types"
import { useOutput } from "@lstudio/outputs"
import styles from './styles.module.css'
import React from "react"
import { initialState } from "../../state"

interface IProps {
  project: ProjectType
  clock: ClockType
}

const Strip = ({ leds, style }: { leds: Color[], style?: React.CSSProperties }) => {
  return <div className={styles.strip} style={style}>
    {leds.map((led, i) => {
      const { r, g, b } = led.getRGB()
      const color = `rgb(${r}, ${g}, ${b})`

      return (
        <div className={styles.stripLed} key={i} style={{
          background: color,
          boxShadow: `0 0 100px ${color}`
        }} />
      )
    })}
  </div>
}

export const WebOutput = ({ project, clock }: IProps) => {
  const state = useOutput({ project, clock, initialState })
  const { strips } = state

  return <div>
    <Strip leds={strips[0].leds} style={{
      left: '25%',
      transform: `translateY(-50%) rotate(${strips[0].rotation}deg)`
    }} />
    <Strip leds={strips[1].leds} style={{
      left: '43%',
      transform: `translateY(-50%) rotate(${strips[1].rotation}deg)`
    }} />
    <Strip leds={strips[2].leds} style={{
      left: '58%',
      transform: `translateY(-50%) rotate(${strips[2].rotation}deg)`
    }} />
    <Strip leds={strips[3].leds} style={{
      left: '76%',
      transform: `translateY(-50%) rotate(${strips[3].rotation}deg)`
    }} />
  </div>
}

export const createWebOuput = (props: IProps) => <WebOutput {...props} />