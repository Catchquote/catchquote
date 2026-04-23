export const UNITS = [
  { value: 'm²',   label: 'm²'           },
  { value: 'sqft', label: 'sqft'         },
  { value: 'm',    label: 'm'            },
  { value: 'ft',   label: 'ft'           },
  { value: 'pfr',  label: 'Per Foot Run' },
  { value: 'mm',   label: 'mm'           },
  { value: 'lot',  label: 'lot'          },
  { value: 'set',  label: 'set'          },
  { value: 'unit', label: 'unit'         },
  { value: 'pcs',  label: 'pcs'          },
  { value: 'point',label: 'point'        },
  { value: 'trip', label: 'trip'         },
  { value: 'day',  label: 'day'          },
  { value: 'hr',   label: 'hr'           },
  { value: 'roll', label: 'roll'         },
  { value: 'panel',label: 'panel'        },
  { value: 'length',label: 'length'      },
]

export function unitLabel(value) {
  return UNITS.find(u => u.value === value)?.label ?? value
}
