import React, {Component} from 'react';
import CalctypeBase from './calctypebase';
import 'antd/dist/antd.css'
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Radio, Collapse, Switch, Input, InputNumber, Col, Row, Button } from 'antd';

const Panel = Collapse.Panel;

class MgManual extends CalctypeBase{
  constructor(props){
    super(props);
    this.state = {
      collapse_active_keys : [],
      fields_autofilled : false,

      // removewater : 'on',
      // cgcent      : 'mol',
      // fgcent      : 'mol',
      // solvetype   : 'lpbe',
      // bcfl        : 'sdh',
      // chgm        : 'spl2',
      // srfm        : 'smol',

      // charge0     : '',
      // charge1     : '',
      // charge2     : '',
      // conc0       : '',
      // conc1       : '',
      // conc2       : '',
      // radius0     : '',
      // radius1     : '',
      // radius2     : '',

    }

    // Setting default form_values
    let initial_values = {
      gcent      : 'mol',
      cgcent      : 'mol',
      fgcent      : 'mol',
      solvetype   : 'lpbe',
      bcfl        : 'sdh',
      chgm        : 'spl2',
      srfm        : 'smol',

      charge0     : '',
      charge1     : '',
      charge2     : '',
      conc0       : '',
      conc1       : '',
      conc2       : '',
      radius0     : '',
      radius1     : '',
      radius2     : '',
    }

    this.props.onFormChange(initial_values)

    this.formItemLayout = {
     labelCol: { span: 7 },
     wrapperCol: { span: 12 },
   };
  }

  componentDidUpdate(){
    if (this.state.response_id !== this.props.autofill.response_id){
      this.autofill_component()
      console.log("Component autofilled.")
    }

  }

  autofill_component(){
    // this.setState({
    let values_for_autofill = {
      // Values filled in by APBS fetch request
      pdie        : this.props.autofill.biomolecularDielectricConstant,
      sdie        : this.props.autofill.dielectricSolventConstant,
      sdens       : this.props.autofill.surfaceConstructionResolution,
      srad        : this.props.autofill.solventRadius,  
      swin        : this.props.autofill.surfaceDefSupportSize,  
      temp        : this.props.autofill.temperature,

      dimenx      : this.props.autofill.dime[0],
      dimeny      : this.props.autofill.dime[1],
      dimenz      : this.props.autofill.dime[2],
      fglenx      : this.props.autofill.fineGridLength[0],
      fgleny      : this.props.autofill.fineGridLength[1],
      fglenz      : this.props.autofill.fineGridLength[2],
      cglenx      : this.props.autofill.coarseGridLength[0],
      cgleny      : this.props.autofill.coarseGridLength[1],
      cglenz      : this.props.autofill.coarseGridLength[2],

      gcentid     : this.props.autofill.gridCenterMoleculeID,
      fgcentid    : this.props.autofill.fineGridCenterMoleculeID,
      cgcentid    : this.props.autofill.coarseGridCenterMoleculeID,

      // Miscellaneous values for flagging
      fields_autofilled : true,
      response_id: this.props.autofill.response_id,

      /** Holdovers: work-around this later in rebuild */
      ofrac       : this.props.autofill.processorMeshOverlap,
      glenx       : this.props.autofill.glen[0],
      gleny       : this.props.autofill.glen[1],
      glenz       : this.props.autofill.glen[2],
      pdimex      : this.props.autofill.pdime[0],
      pdimey      : this.props.autofill.pdime[1],
      pdimez      : this.props.autofill.pdime[2],
      // gcent : this.props.autofill.gridCenterMethod,
      nlev : this.props.autofill.nlev,

    }
    // })

    let new_values = this.props.form_values
    new_values = Object.assign(new_values, values_for_autofill)
    this.props.onFormChange(new_values)

    // Miscellaneous state values for flagging
    this.setState({
      fields_autofilled : true,
      response_id: this.props.autofill.response_id,
    })

  }

  handleFormChange = (e, nameString) => {
    let itemName  = (nameString === undefined) ? e.target.name : nameString;
    let itemValue = (e.target !== undefined) ? e.target.value : e;
    console.log('itemName:  ' + itemName)
    console.log('itemValue: ' + itemValue)
    // this.setState({
    //   [itemName] : itemValue
    // })
    this.props.onFormChange(itemValue, itemName)
  }

  /** Updates state for mg-auto Collapse component */
  updateCollapseActiveKeys = (new_activeKeys) => {
    // console.log("hellow world collapse")
    this.setState({ collapse_active_keys: new_activeKeys })
  }

  /** Handler to expand or collapse all mg-auto related panels */
  handleExpandAll = (e) => {
    console.log(e)
    if(this.state.collapse_active_keys.length > 0){
      this.setState({ collapse_active_keys : [] })
    }
    else{
      // A bit of a cheat since we know there's 14 panels,
      //  and that this config section is independent from 
      //  other calculation methods
      this.setState({
        collapse_active_keys : ['0', '1', '2', '3', '4', '5', '6',
                                '7', '8', '9', '10', '11', '12', '13' ]
      })
    }
  }

  renderGridPointsDomain(){
    return(
      <Col offset={6}>
        <Row gutter={16} style={{marginBottom: 8}}>
          <Col  span={6}>Grid Points Per Processor </Col>
          <Col  span={6}>Mesh Domain Lengths </Col>
        </Row>
        
        <Row gutter={16} style={{marginBottom: 8}}>
          <Col  span={6}>{this.renderNumericalField('X-direction','dimenx', this.props.form_values.dimenx)}</Col>
          <Col  span={6}>{this.renderNumericalField('X-direction','glenx', this.props.form_values.cglenx)}</Col>
        </Row>
        
        <Row gutter={16} style={{marginBottom: 8}}>
          <Col  span={6}>{this.renderNumericalField('Y-direction','dimeny', this.props.form_values.dimeny)}</Col>
          <Col  span={6}>{this.renderNumericalField('Y-direction','gleny', this.props.form_values.gleny)}</Col>
        </Row>

        <Row gutter={16} style={{marginBottom: 8}}>
          <Col  span={6}>{this.renderNumericalField('Z-direction','dimenz', this.props.form_values.dimenz)}</Col>
          <Col  span={6}>{this.renderNumericalField('Z-direction','glenz', this.props.form_values.glenz)}</Col>
        </Row>
      </Col>
    )
  }

  renderGridCenter(){
    let inputFields = null;
    console.log(this.props.form_values.gcent)
    if (this.props.form_values.gcent == 'mol'){
      inputFields = <Input name='gcentid' placeholder='Molecule ID' value={this.props.form_values.gcentid} onChange={this.handleFormChange}/>
    }
    else if(this.props.form_values.gcent == 'coord'){
      inputFields = 
        <div>
          <Input name='gxcent' placeholder='x-coordinate' onChange={this.handleFormChange}/>
          <Input name='gycent' placeholder='y-coordinate' onChange={this.handleFormChange}/>
          <Input name='gzcent' placeholder='z-coordinate' onChange={this.handleFormChange}/>
        </div>
    }

    return(
      <div>
        <Row>
          <Radio.Group name='gcent' buttonStyle='solid' value={this.props.form_values.gcent} onChange={this.handleFormChange}>
            <Radio.Button value='mol'> Center grid on a molecule</Radio.Button>
            <Radio.Button value='coord'> Manually enter coordinates for center of grid</Radio.Button>
          </Radio.Group>
        </Row>
        <Row>
          <Col span={4}>
            {inputFields}
          </Col>
        </Row>
      </div>
    )
  }

  renderPbeType(){
    let name = 'solvetype';
    let choices = {
      'lpbe' : 'Linearized',
      'npbe' : 'Nonlinearized',
    }
    return this.renderRadioGroup(name, choices, this.props.form_values.solvetype);
  }

  renderBoundary(){
    let name = 'bcfl';
    let choices = {
      'zero'  : 'Zero',
      'sdh'   : 'Single Debye-Huckel',
      'mdh'   : 'Multiple Debye-Huckel',
      'focus' : 'Focusing',
    }
    return this.renderRadioGroup(name, choices, this.props.form_values.bcfl);
  }

  renderMobileIon(){
    /** color: rgba(0, 0, 0, 0.65); */
    return(
      <Col offset={4}>
        <Row gutter={16} style={{marginBottom: 8}}>
          <Col  span={6}>Charge (E<sub>C</sub>) </Col>
          <Col  span={6}>Concentration (M) </Col>
          <Col  span={6}>Radius (A)</Col>
        </Row>
        
        <Row gutter={16} style={{marginBottom: 8}}>
          <Col  span={6}>{this.renderNumericalField('Ion 1','charge0', this.props.form_values.charge0)}</Col>
          <Col  span={6}>{this.renderNumericalField('Ion 1','conc0', this.props.form_values.conc0)}</Col>
          <Col  span={6}>{this.renderNumericalField('Ion 1','radius0', this.props.form_values.radius0)}</Col>
        </Row>
        
        <Row gutter={16} style={{marginBottom: 8}}>
          <Col  span={6}>{this.renderNumericalField('Ion 2','charge1', this.props.form_values.charge1)}</Col>
          <Col  span={6}>{this.renderNumericalField('Ion 2','conc1', this.props.form_values.conc1)}</Col>
          <Col  span={6}>{this.renderNumericalField('Ion 2','radius1', this.props.form_values.radius1)}</Col>
        </Row>

        <Row gutter={16} style={{marginBottom: 8}}>
          <Col  span={6}>{this.renderNumericalField('Ion 3','charge2', this.props.form_values.charge2)}</Col>
          <Col  span={6}>{this.renderNumericalField('Ion 3','conc2', this.props.form_values.conc2)}</Col>
          <Col  span={6}>{this.renderNumericalField('Ion 3','radius2', this.props.form_values.radius2)}</Col>
        </Row>
      </Col>
    )
  }
  
  renderPointCharges(){
    let name = 'chgm';
    let choices = {
      'spl0'   : 'Traditional trilinear interpolation',
      'spl2'   : 'Cubic B-spline discretization',
      'spl4'   : 'Quintic B-spline discretization',
    }
    return this.renderRadioGroup(name, choices, this.props.form_values.chgm);
  }

  renderDielectric(){
    let name = 'srfm';
    let choices = {
      'mol'    : 'Molecular Surface Defiinition',
      'smol'   : '9-point Harmonic Averaging',
      'spl2'   : 'Cubic-Spline Surface',
      'spl4'   : '7th Order Polynomial',
    }
    return this.renderRadioGroup(name, choices, this.props.form_values.srfm);
  }

  /** Generic function to render numerical input field,
   *    using passed-in parameter objects
   */
  // renderGridGroup(label )
  
  renderExpandAllButton(){
    if(this.state.collapse_active_keys.length == 0){
      return <Button type='primary' onClick={this.handleExpandAll}> <RightOutlined /> Expand All </Button>;
    }
    else{
      return <Button type='primary' onClick={this.handleExpandAll}> <DownOutlined /> Collapse All </Button>;
    }
    // return button;
  }

  /**
   * Regular render() function used by React.
   * 
   * NOTE:  For each <Panel/> object, the forceRender prop is neccessary
   *        so that the form data within is passed to the server in despite
   *        whether the user opens it. 
   */
  render(){

    return(
      <div>
        <Form.Item label={`${this.props.form_label} Configuration`}>
        {/* <Col offset={6} span={12}> */}
        {this.renderExpandAllButton()}
        <Col>
          <Collapse activeKey={this.state.collapse_active_keys} onChange={this.updateCollapseActiveKeys}>
            <Panel forceRender={true} header='GRID POINTS AND DOMAIN LENGTHS'>
              {this.renderGridPointsDomain()}
            </Panel>

            <Panel forceRender={true} header="DEPTH OF THE MULTILEVEL HIERARCHY USED IN THE MULTIGRID SOLVER">
              <Col span={4}> {this.renderNumericalField('', 'nlev', this.props.form_values.nlev)} </Col>
            </Panel>

            <Panel forceRender={true} header='CENTER OF THE GRID'>
              {this.renderGridCenter()}
            </Panel>

            <Panel forceRender={true} header='TYPE OF PBE TO BE SOLVED'>
              {this.renderPbeType()}
            </Panel>
            
            <Panel forceRender={true} header='BOUNDARY CONDITION DEFINITION'>
              {this.renderBoundary()}
            </Panel>
            
            <Panel forceRender={true} header='MOBILE ION SPECIES PRESENT IN SYSTEM (OPTIONAL)'>
              {this.renderMobileIon()}
            </Panel>

            <Panel forceRender={true} header='BIOMOLECULAR DIELECTRIC CONSTANT'>
              <Col span={4}> {this.renderNumericalField('', 'pdie', this.props.form_values.pdie)} </Col>
            </Panel>
            
            <Panel forceRender={true} header='DIELECTRIC CONSTANT OF SOLVENT'>
              <Col span={4}> {this.renderNumericalField('', 'sdie', this.props.form_values.sdie)} </Col>
            </Panel>
            
            <Panel forceRender={true} header='METHOD BY WHICH THE BIOMOLECULAR POINT CHARGES ARE MAPPED ONTO THE GRID'>
              {this.renderPointCharges()}
            </Panel>
            
            <Panel forceRender={true} header='NUMBER OF GRID POINTS PER SQUARE-ANGSTROM TO USE IN SURFACE CONSTRUCTIONS'>
              <Col span={4}> {this.renderNumericalField('', 'sdens', this.props.form_values.sdens)} </Col>
            </Panel>

            <Panel forceRender={true} header='MODEL TO USE TO CONSTRUCT THE DIELECTRIC ION-ACCESSIBILITY COEFFICIENTS'>
              {this.renderDielectric()}
            </Panel>

            <Panel forceRender={true} header='RADIUS OF THE SOLVENT MOLECULES'>
              <Col span={4}> {this.renderNumericalField('', 'srad', this.props.form_values.srad)} </Col>
            </Panel>
            
            <Panel forceRender={true} header='SIZE OF THE SUPPORT FOR SPLINE-BASED SURFACE DEFINITIONS'>
              <Col span={4}> {this.renderNumericalField('', 'swin', this.props.form_values.swin)} </Col>
            </Panel>
            
            <Panel forceRender={true} header='TEMPERATURE FOR PBE CALCULATION (IN K)'>
              {/* <Col span={4}> {this.renderNumericalField('in Kelvin', 'temp', this.props.autofill.temperature)} </Col> */}
              {/* <Col span={4}> {this.renderNumericalField('in Kelvin', 'temp', this.state.temp)} </Col> */}
              <Col span={4}> {this.renderNumericalField('in Kelvin', 'temp', this.props.form_values.temp)} </Col>
            </Panel>

          </Collapse>
        </Col>
        </Form.Item>

        {/** HOLDOVER ELEMENTS. PHASE OUT LATER IN REBUILD */}
        <input hidden type='text' name='ofrac' value={this.props.form_values.ofrac} />
        <input hidden type='text' name='glenx' value={this.props.form_values.glenx} />
        <input hidden type='text' name='gleny' value={this.props.form_values.gleny} />
        <input hidden type='text' name='glenz' value={this.props.form_values.glenz} />
        <input hidden type='text' name='pdimex' value={this.props.form_values.pdimex} />
        <input hidden type='text' name='pdimey' value={this.props.form_values.pdimey} />
        <input hidden type='text' name='pdimez' value={this.props.form_values.pdimez} />
        <input hidden type='radio' name='gcent' value={this.props.form_values.gridCenterMethod} checked/>
        {/* <input hidden type='radio' name='gcent' value={this.props.autofill.gridCenterMethod} checked/> */}
        {/* <input hidden type='radio' name='gcent' value={this.props.autofill.gridCenterMethod} checked/> */}
        <input hidden type='text' name='gcentid' value={this.props.autofill['gridCenterMoleculeID']} />

      </div>
    )
  }
}

export default MgManual;