import * as React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  step?: number
  onIncrement?: () => void
  onDecrement?: () => void
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, step = 0.01, onIncrement, onDecrement, value, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => inputRef.current!)

    const createChangeEvent = (newValue: string): React.ChangeEvent<HTMLInputElement> => {
      const event = {
        target: { value: newValue },
        currentTarget: { value: newValue }
      } as React.ChangeEvent<HTMLInputElement>
      return event
    }

    const handleIncrement = () => {
      if (onIncrement) {
        onIncrement()
      } else {
        const current = parseFloat(String(value || 0))
        const newValue = (current + step).toFixed(step < 1 ? 2 : 0)
        if (onChange) {
          const event = createChangeEvent(newValue)
          onChange(event)
        }
      }
    }

    const handleDecrement = () => {
      if (onDecrement) {
        onDecrement()
      } else {
        const current = parseFloat(String(value || 0))
        const min = props.min ? parseFloat(String(props.min)) : 0
        const newValue = Math.max(min, current - step).toFixed(step < 1 ? 2 : 0)
        if (onChange) {
          const event = createChangeEvent(newValue)
          onChange(event)
        }
      }
    }

    return (
      <div className="number-input-wrapper relative">
        <Input
          ref={inputRef}
          type="number"
          step={step}
          value={value}
          onChange={onChange}
          className={cn("pr-10", className)}
          {...props}
        />
        <div className="number-input-spinner">
          <button
            type="button"
            onClick={handleIncrement}
            aria-label="Increase value"
          >
            <ChevronUp />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            aria-label="Decrease value"
          >
            <ChevronDown />
          </button>
        </div>
      </div>
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }

