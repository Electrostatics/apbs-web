import React, { Component } from 'react';
import {Radio, Input} from 'antd';

class CalctypeBase extends Component{
  constructor(props){
    super(props);
    this.state = {}
  }

  /** Updates current state of form values when changed */
  handleFormChange = (e, nameString) => {
    let itemName  = (nameString === undefined) ? e.target.name : nameString;
    let itemValue = (e.target !== undefined) ? e.target.value : e;
    console.log('itemName:  ' + itemName)
    console.log('itemValue: ' + itemValue)
    this.setState({
      [itemName] : itemValue
    })
  }

  /** Generic function to render numerical input field,
   *    using passed-in parameter objects
   */
  renderNumericalField(placeholderText, fieldName, defaultVal=null){
    return(
      <Input name={fieldName} placeholder={placeholderText} value={defaultVal} onChange={this.handleFormChange}/>
    )
  }

  /** Generic function to render radio button group,
   *    using passed-in parameter objects
   */
  renderRadioGroup(label, choiceObj, defaultVal=null){
    let all_choices = []

    /** create list of radio button options */
    for (let val in choiceObj){
      all_choices.push(
        <Radio.Button value={val}>{choiceObj[val]}</Radio.Button>
      )
    }

    /** combine list of radio buttons into radio button group */
    return(
      <Radio.Group name={label} defaultValue={defaultVal} buttonStyle='solid' onChange={this.handleFormChange}>
        {all_choices}
      </Radio.Group>
    )
  }
  
}

export default CalctypeBase