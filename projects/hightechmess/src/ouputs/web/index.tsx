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
  const { stripOne, stripTwo, stripThree, stripFour } = state

  return <div>
    <Strip leds={stripOne} style={{
      left: '20%',
      transform: 'rotate(-20deg)'
    }} />
    <Strip leds={stripTwo} style={{
      left: '30%',
      transform: 'rotate(-10deg)'
    }} />
    <Strip leds={stripThree} style={{
      left: '70%',
      transform: 'rotate(10deg)'
    }} />
    <Strip leds={stripFour} style={{
      left: '80%',
      transform: 'rotate(20deg)'
    }} />
  </div>
}

export const createWebOuput = (props: IProps) => <WebOutput {...props} />