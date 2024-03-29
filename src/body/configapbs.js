// NPM imports
import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css'
import { ExportOutlined, SettingOutlined, UploadOutlined, FormOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Affix,
  Layout,
  Menu,
  Button,
  Switch,
  Input,
  Radio,
  Checkbox,
  Row,
  Col,
  InputNumber,
  Tooltip,
  Upload,
  Collapse,
  Spin,
  message,
  Tabs,
} from 'antd';
// import Radio.Group from 'antd/lib/radio/group';

// Project imports
import { hasAnalyticsId, hasMeasurementId, sendPageView, sendRegisterClickEvent } from './utils/ga-utils'
import ConfigForm from './utils/formutils';
import { MgAuto, MgPara, MgManual, FeManual, MgDummy } from './apbs/calculationtypes';
import WorkflowHeader from '../common/WorkflowHeader.tsx';
import { WORKFLOW_TYPES } from '../common/WorkflowHeader.tsx';

const { Content, Sider } = Layout;
const Panel = Collapse.Panel;
const TabPane = Tabs.TabPane;

/**
 * Component defining how the APBS job configuration page is rendered
 */
class ConfigAPBS extends ConfigForm {

  constructor(props){
    super(props);
    if( hasAnalyticsId() ){
      ReactGA.pageview(window.location.pathname + window.location.search)
    }

    this.state = {
      job_submit: false,
      job_date: null,
      successful_submit: false,

      allCollapsed : true,
      
      /** state variables related to PQR upload */
      jobid: this.props.jobid,
      autofill_data: {},
      did_fetch: false,
      pqrFileList: [],
      
      // related to APBS input file
      use_input_file: true,
      infileList: [],
      readfileList: [],
      // expected_input_files: [],
      show_apbs_misc_upload: false,

      v2_form_values: {
        support_files: [],
        filename: null
      },
      
      /**
       elec_calctype: 'mg-auto',
       calculate_energy: 'total',
       calculate_forces: 'no',
       output_scalar: [],
       output_format: 'dx',
       */
      
      parent_form_values: {
        /** state variables related to form user input */
        // read_type: 'mol',
        type: 'mg-auto',
        calcenergy: 'total',
        calcforce: 'no',
        output_scalar: ['writepot'],
        removewater: false,
        writeformat: 'dx',
        
        /** Hidden element holdovers from original website */
        hiddencheck: 'local',
        // pdb2pqrid: null,
        mol: '1',
      },
      
      removewater: 'on',
      
      child_form_values: {},
      
      // Registration button states
      show_register_button: false,
      // show_register_button: true,
    }

    // this.handleFormChange = this.handleFormChange.bind(this)
    // this.handlePqrUpload = this.handlePqrUpload.bind(this);
    // this.calc_method_component = this.renderMethodFormItems();
    // this.handleNewJobSubmit = this.handleNewJobSubmit.bind(this)
  }

  renderRegistrationButton(){
    if( this.state.show_register_button ){
      return(
        <div>
          {/* For continued support of this server, please <b>register</b> your use of this software:
          <br/> */}
          <Form.Item
                  label="For continued support of this server, please register your use of this software:"
          >
          <a href={window._env_.REGISTRATION_URL} target="_blank" rel="noopener noreferrer">
            <Button
              className='registration-button' 
              type="default"  
              icon={<FormOutlined />}
              onClick={() => sendRegisterClickEvent('apbs')}
            >
              Register Here
            </Button>
          </a>
          </Form.Item>

          {/* <br/>
          <br/> */}
        </div>
      )
    }
  }


  /** If user tries submitting job again, raise alert. */
  // handleNewJobSubmit(e, self){
  handleNewJobSubmit(e){
    e.preventDefault();
    let self = this
    console.log('WE IN NEWJOBSUBMIT')
    if(self.state.job_submit)
      alert("Job is submitted. Redirecting to job status page");
    else{
      self.setState({
        job_submit: true
      })

      let payload;
      if ( self.props.jobid ){
        let combined_form_data = self.state.parent_form_values;
        Object.assign(combined_form_data, self.state.child_form_values);

        // Delete 'removewater' from payload if false
        if( combined_form_data.removewater ){
          combined_form_data.removewater = 'on'
        }else{
          delete combined_form_data.removewater
        }

        payload = {
          form : combined_form_data,
          metadata: { }
        }
      }
      else{
        payload = {
          form : self.state.v2_form_values,
          metadata: { }
        }
      }
      console.log(payload)
      
      // Submit the form to the workflow service
      let form_post_headers = {
        'x-requested-with': '',
        'Content-Type': 'application/json'
      }

      /**
       * Get presigned URLs for files we plan to upload
       */

      // Prepare file list and token request payload
      let job_file_name = 'apbs-job.json'
      let upload_file_names = []
      let upload_file_data = {}      
      let token_request_payload = {}
      if( self.props.jobid ){
        token_request_payload['job_id'] = this.state.jobid
      }else{
        // Add file names and data to token request payloads
        for( let file of [].concat( self.state.infileList, self.state.readfileList ) ){
          upload_file_names.push( file.name )
          upload_file_data[ file.name ] = file.originFileObj
        }
      } 
      
      // Create upload payload
      token_request_payload['file_list'] = upload_file_names

      // Add job config file/data to upload lists
      upload_file_names.push( job_file_name )
      upload_file_data[job_file_name] = JSON.stringify(payload)

      this.uploadJobFiles(job_file_name, token_request_payload, upload_file_data)
    }
  }

  componentDidMount(){
    if(this.props.jobid){
      this.fetchAutofillData(this.state.jobid)
      this.toggleRegisterButton(true)
    }
    else{
      // this.getNewJobID()
    }
  }

  fetchAutofillData(jobid){
    let self = this
    let autofill_objectname = ''
    if( self.usingJobDate() ){
      autofill_objectname = `${self.props.jobdate}/${jobid}/${jobid}.in`
    }else{
      autofill_objectname = `${jobid}/${jobid}.in`
    }

    fetch(`${window._env_.OUTPUT_BUCKET_HOST}/${autofill_objectname}`)
      .then(response => response.text())
      .then(file_text => {
        let data = this.convertInfileToJson(file_text)
        data['response_id'] = jobid

        self.setState({
          autofill_data: data,
          did_fetch: true,
        })
      })
      .catch(error => console.error(error));
    self.handleParentFormChange({}, 'pdb2pqrid', jobid)
  }

  convertInfileToJson(infile_data){
    let infile_json = {
      solventRadius: null,
      gridCenterMoleculeID: 1,
      surfaceConstructionResolution: null,
      pdbID: this.state.jobid,
      glen: null,
      temperature: null,
      writePotentialLaplacian: null,
      format: 'dx',
      surfaceDefSupportSize: null,
      processorMeshOverlap: 0.1,
      calculationForce: 'no',
      fineGridLength: null,
      pdime: [1.0, 1.0, 1.0],
      calculationType: 'mg-auto',
      dielectricSolventConstant: null,
      dime: null,
      pqrname: `${this.state.jobid}.pqr`,
      coarseGridLength: null,
      biomolecularDielectricConstant: null,
      biomolecularPointChargeMapMethod: 'spl2',
      fineGridCenterMoleculeID: 1,
      coarseGridCenterMoleculeID: 1,
      asyncflag: 0,
      gridCenterMethod: 'molecule',
      nlev: 4,
      async: 0,
    }

    // Carve off READ section and everything following end of ELEC section
    let read_section = infile_data.split('end')[1].trim()
    
    // Extract read section text (everything after 'ELEC' declaration)
    read_section = read_section.split('elec')[1].trim()

    // Split remainder by lines
    let read_section_lines = read_section.split('\n')
    for( let line_num in read_section_lines ){
      // Trim whitespace from line
      read_section_lines[line_num] = read_section_lines[line_num].trim()

      // Assign contents to respective item to autofill component
      let line_contents = read_section_lines[line_num].trim().split(' ')
      let keyword = line_contents.shift()
      switch(keyword){
        case 'dime':
          infile_json.dime = line_contents.map(Number)
          break;
        case 'cglen':
          infile_json.coarseGridLength = line_contents.map(Number)
          break;
        case 'fglen':
          infile_json.fineGridLength = line_contents.map(Number)
          break;
        case 'pdie':
          infile_json.biomolecularDielectricConstant = parseFloat(line_contents[0])
          break;
        case 'sdie':
          infile_json.dielectricSolventConstant = parseFloat(line_contents[0])
          break;
        case 'sdens':
          infile_json.surfaceConstructionResolution = parseFloat(line_contents[0])
          break;
        case 'srad':
          infile_json.solventRadius = parseFloat(line_contents[0])
          break;
        case 'swin':
          infile_json.surfaceDefSupportSize = parseFloat(line_contents[0])
          break;
        case 'temp':
          infile_json.temperature = parseFloat(line_contents[0])
          break;
      }
    }

    // Assign keys not found in infile but assigned in PDB2PQR source code
    infile_json.glen = infile_json.coarseGridLength

    return infile_json
  }

  isTypeMultigrid(){
    return this.state.parent_form_values.type.startsWith('mg-')
  }
  
  isTypeFiniteElement(){
    return this.state.parent_form_values.type === 'fe-manual'
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

  handleParentFormChange = (e, nameString, passedVal) => {
    let name = (nameString === undefined) ? e.target.name : nameString;
    let value = (e.target !== undefined) ? e.target.value : e;
    if(passedVal !== undefined) value = passedVal;
    let parent_form_values = this.state.parent_form_values;

    parent_form_values[name] = value
    // console.log(parent_form_values)
    this.setState({ parent_form_values })
  }

  /** Updates current form values from child components.
   * 
   *  If value is an object and name is null, then the calctype-
   *  specific contents of the form_value object are overwritten.
   *  This case will usually only occurs during initialization
   *  of a calculation method's form component
   */
  handleChildFormChange = (value, name=null) => {
    let child_form_values = null;
    
    if (name === null && typeof value === 'object'){
      child_form_values = value
    }
    else{
      child_form_values = this.state.child_form_values
      child_form_values[name] = value
    }
    console.log('child_form_values: ')
    console.log(child_form_values)
    this.setState({ child_form_values })
  }


  renderInfileUpload(){
    return (
      <div>
          <Form.Item label="Choose the APBS input file">
            <Upload
              name='file_data'
              accept='.in'
              // action={`${window._env_.STORAGE_URL}/${this.state.jobid}`}
              fileList={this.state.infileList}
              beforeUpload={ (e) => this.inspectReadfile(e, this, 'infile') }
              onChange={ (e) => this.handleInfileUpload(e, this) }
              rules={[
                {
                  required: true,
                  message: 'Please choose a *.in file to upload',
                }
              ]}
            >
              <Button icon={<UploadOutlined />} disabled={!this.state.use_input_file}>
                Upload APBS input file
              </Button>
            </Upload>
          </Form.Item>
        {/* </div> */}

          <Form.Item label="Upload supporting files for the APBS input file above">
            <Upload
              name='file_data'
              // accept='.pqr'
              // action={`${window._env_.STORAGE_URL}/${this.state.jobid}`}
              fileList={this.state.readfileList}
              beforeUpload={ (e) => this.inspectReadfile(e, this) }
              onChange={ (e) => this.handleReadfileUpload(e, this) }
              rules={[
                {
                  required: true,
                  // message: `Please upload supporting files ${this.state.expected_input_files}`,
                  message: `Please upload one or more supporting files for APBS input`,
                }
              ]}
            >
              <Button icon={<UploadOutlined />} disabled={!this.state.show_apbs_misc_upload}>
                Upload APBS read files
              </Button>
            </Upload>
          </Form.Item>
      </div>
    );
  }

  handleInfileUpload(info, self){
    if (info.file.status !== 'uploading') {
      console.log('uploading')
      // console.log(info.file, info.fileList);
    }
    if (info.file.status === 'done') {
      message.success(`APBS input file ${info.file.name} uploaded successfully`);
      console.log(`APBS input file ${info.file.name} uploaded successfully`)
      self.setState({ show_apbs_misc_upload: true })
    }
    else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
      self.setState({ show_apbs_misc_upload: false })
    }

    // fileList: info.fileList.slice(-1),
    // Only keep the last uploaded infile on display
    console.log(self.state.infileList)
    if( info.fileList.length > 0 ){
      self.setState({ infileList: info.fileList.slice(-1) })
    }else{
      // Reset expected files if selected file is removed
      let updated_v2_form_values = this.state.v2_form_values
      updated_v2_form_values.filename = null
      self.setState({ 
        infileList: info.fileList,
        v2_form_values: updated_v2_form_values,
        // expected_input_files: [],
      })
    }
    console.log(self.state.infileList)    
  }
  
  extractAdditionalInputFiles(apbs_infile_text){
    let lines = apbs_infile_text.split( /\r\n|\n/ )
    let READ_start = false
    let READ_end = false
    let file_list = []
    for( let line of lines ){
      let line_stripped = line.trim()
      let split_line = line_stripped.split(' ')

      if( READ_start && READ_end){ 
        break
      }

      else if( !READ_start && !READ_end ){
        if( !line_stripped.startsWith('#') ){ // Ignore comment lines of *.in file
          if( split_line.length > 0 ){
            if( split_line[0].toUpperCase() === 'READ' ){
              READ_start = true
            }
            else if( split_line[0].toUpperCase() === 'END' ){
              READ_end = true
            }
          }
        }
      }

      else if( READ_start && !READ_end ){
        if( !line_stripped.startsWith('#') ){
          if( split_line.length > 0 ){
            if( split_line[0].toUpperCase() === 'END' ){
              READ_end = true
            }
            else{
              for( let arg of split_line.slice(2) ){
                file_list.push( arg )
              }
            }
          }
        }
      }

    }

    return file_list
  }

  inspectReadfile(file, self, file_type){
    if ( file_type === 'infile'){
      if(!file.name.endsWith('.in')){
        message.error('You must upload an APBS input (*.in) file!');
        return false;
      }
      else{
        let v2_form_values = self.state.v2_form_values;
        v2_form_values['filename'] = file.name;
        // v2_form_values['support_files'] = [] //TODO: use later to communicate to server the expected READ files

        // read file, checking READ section for related input files (e.g. *.pqr files)
        // Record names of additional inputs files
        // Record number of additional input files ( len(namefile_list) )
        
        // Use commented code below if file.text() isn't working in Safari
        // file.arrayBuffer()
        //   .then(buffer => {
        //     let file_text = decodeURIComponent(escape(String.fromCharCode.apply(null, new Uint8Array(buffer))))
        //     return file_text
        //   })
        file.text()
          .then(readfile_text => {
            // Get list of expected supporting files (e.g. *.pqr, etc.)
            // let expected_input_files = self.extractAdditionalInputFiles( readfile_text )
            // TODO: If no READ section is found, return false (don't upload)

            // Reset file list if supporting files are already selected
            let readfileList = self.state.readfileList
            if( self.state.readfileList.length > 0 ){
              readfileList = []
              v2_form_values.support_files = []
            }

            // Update state
            self.setState({ 
              // expected_input_files: expected_input_files,
              show_apbs_misc_upload: true,
              readfileList,
            })
          })
          .catch(error => {
            console.error( error )
            self.setState({
              show_apbs_misc_upload: false
            })
          })

        // Update form values 
        self.setState({ v2_form_values });
      }
    }

    // Prevent auto-upload
    return false
  }

  handleReadfileUpload(info, self){
    if (info.file.status !== 'uploading'){
      console.log('uploading readfile')
    }
    if (info.file.status === 'done'){
      message.success(`${info.file.name} file uploaded successfully`);
      console.log(`${info.file.name} file uploaded successfully`)
    }
    else if (info.file.status === 'error'){
      message.error(`${info.file.name} file upload failed.`);
    }
    
    self.toggleRegisterButton(true)
    
    // // Show message error if file not in expected support files
    // if( !self.state.expected_input_files.includes(info.file.name) ){
    //   message.error(`Cannot upload ${info.file.name}. Please upload file(s) defined in ${self.state.v2_form_values['filename']}: ${self.state.expected_input_files}.`);
    //   return
    // }

    // have file list show most recent upload
    let v2_form_values = this.state.v2_form_values
    v2_form_values.support_files = info.fileList.map(file => file.name)
    self.setState({ 
      readfileList: info.fileList,
      v2_form_values: v2_form_values
    })
  }

  renderReadfileUpload(){
    return (
      <div>
        {/* <div hidden={!this.state.use_input_file}> */}
          <Form.Item label="Choose the APBS input file">
            <Upload
              name='file_data'
              accept='.pqr'
              action={`${window._env_.STORAGE_URL}/${this.state.jobid}/${this.state.jobid}.in`}
              fileList={this.state.infileList}
              beforeUpload={ (e) => this.inspectReadfile(e, this, null) }
              onChange={ (e) => this.handleReadfileUpload(e, this) }
            >
              <Button icon={<UploadOutlined />} disabled={!this.state.use_input_file}>
                Upload APBS input file
              </Button>
            </Upload>
          </Form.Item>
        {/* </div> */}
      </div>
    );

  }


  /** Creates button to upload a PQR file to use as base for autofilling the form */
  renderPqrAutofillUpload(){
    return (
      <Form.Item label="Autofill with PQR file">
        <Upload
          name='file'
          accept='.pqr'
          // action={`${window._env_.AUTOFILL_URL}/api/autofill/upload/${this.state.jobid}/apbs`}
          action={`${window._env_.AUTOFILL_URL}/upload/${this.state.jobid}/apbs`}

          // action={'http://jsonplaceholder.typicode.com/posts/'}
          fileList={this.state.pqrFileList}
          beforeUpload={(e) => this.doubleUploadConfirm(e, this)}
          onChange={ (e) => this.handlePqrAutofillUpload(e, this)}
        >
          <Button icon={<UploadOutlined />}>
            Click to Upload PQR File
          </Button>
        </Upload>
      </Form.Item>
    );
  }

  doubleUploadConfirm(file, self){
    if(self.state.did_fetch){
      console.log(self.state.did_fetch)
      return window.confirm('Uploading a new file will overwrite ALL values within form. Continue?');
    }
    else{
      console.log('values not yet autofilled')
      return true;
    }
  }
  
  handlePqrAutofillUpload(info, self){
    if (info.file.status !== 'uploading') {
      console.log('uploading')
      // console.log(info.file, info.fileList);
    }
    if (info.file.status === 'done') {
      message.success(`${info.file.name} file uploaded successfully`);
      console.log(`${info.file.name} file uploaded successfully`)
      self.setState({
        jobid: info.file.response['job_id'],
      })
      self.fetchAutofillData(self.state.jobid);
    }
    else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }

    // fileList: info.fileList.slice(-1),
    console.log(self.state.pqrFileList)
    self.setState({ pqrFileList: info.fileList.slice(-1) })
    console.log(self.state.pqrFileList)
  }

  /** Creates and returns the sidebar component. */
  renderSidebar(){
    return(
      <Affix offsetTop={80}>
        <Sider width={200} style={{ background: '#ffffff' }}>
          <Menu
          // theme="dark"
          mode="inline"
          defaultSelectedKeys={['which_pdb']}
          style={{ height: '100%', borderRight: 0 }}
          >

          </Menu>
        </Sider>
      </Affix>
    )
  }

  /** 
   * renderDropdown(panelHeader =string, options =array)
   *    panelHeader:  string to display on the header field of Panel component
   *    options:      array collection of form objects to display within Panel
   */
  renderCollapsePanel(panelHeader, optionObjs){
    return(
      <Panel header={panelHeader} isActive={true} forceRender={true}>
        {optionObjs}
      </Panel>
    );
  }

  renderCalcChoices(){
    let header = 'CALCULATION METHOD TO USE:';
    let outputNameField = 'type';
    let radioOptions = [];
    let outputOptions = 
      {
        'mg-auto'   : 'mg-auto',
        'mg-para'   : 'mg-para',
        'mg-manual' : 'mg-manual',
        'fe-manual' : 'fe-manual',
        'mg-dummy'  : 'mg-dummy',
      }

      for (let optVal in outputOptions){
        radioOptions.push(
          <Radio.Button value={optVal}> {outputOptions[optVal]} </Radio.Button>
        )
      }
      let outputGroup = 
      // <Radio.Group name={outputNameField} defaultValue={this.state.type} onChange={this.handleFormChange} buttonStyle='solid'> {radioOptions} </Radio.Group>
        <Radio.Group name={outputNameField} defaultValue={this.state.parent_form_values.type} onChange={this.handleParentFormChange} buttonStyle='solid'> {radioOptions} </Radio.Group>
      ;
  
      // return this.renderCollapsePanel(header, outputGroup);
      return outputGroup;
  }

  /** Renders the majority of the configuration options depending calculation method in use.
   * 
   *  The variable components of configuring each form is delegated to
   *  separate class files, with the intent to keep the form setups separated
   */
  renderMethodFormItems(){
    console.log("Calculation Method Type: " + this.state.parent_form_values.type)
    switch(this.state.parent_form_values.type){
      case "mg-auto":
        return <MgAuto
                  form_label={this.state.parent_form_values.type}
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />

      case "mg-para":
        return <MgPara
                  form_label={this.state.parent_form_values.type}
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />

      case "mg-manual":
        return <MgManual
                  form_label={this.state.parent_form_values.type}
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />

      case "fe-manual":
        return <FeManual
                  form_label={this.state.parent_form_values.type}
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />

      case "mg-dummy":
        return <MgDummy
                  form_label={this.state.parent_form_values.type}
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />
    }
  }

  renderCalcEnergy(){
    let header = 'CALCULATION OF ELECTROSTATIC ENERGY FROM A PBE CALCULATION:';
    let outputNameField = 'calcenergy';
    let radioOptions = [];
    let outputOptions = 
      { 'no'   : 'Don\'t calculate any energies', 
        'total': 'Calculate and return total electrostatic energy for the entire molecule',
        'comps': 'Calculate and return total electrostatic energy for the entire molecule as well as energy components for each atom'
      };

    for (let optVal in outputOptions){
      radioOptions.push(
        <Radio style={this.radioVertStyle} value={optVal}> {outputOptions[optVal]} </Radio>
      )
    }
    let outputGroup = 
      <Radio.Group name={outputNameField} defaultValue={this.state.parent_form_values.calcenergy} onChange={this.handleParentFormChange}> {radioOptions} </Radio.Group>
    ;

    return this.renderCollapsePanel(header, outputGroup);
  }


  renderCalcForces(){
    let header = 'CALCULATION OF ELECTROSTATIC AND APOLAR FORCE OUTPUTS FROM A PBE CALCULATION:';
    let outputNameField = 'calcforce';
    let radioOptions = [];
    let outputOptions = 
      { 'no'   : 'Don\'t calculate any forces', 
        'total': 'Calculate and return total electrostatic and apolar forces for the entire molecule',
        'comps': 'Calculate and return total electrostatic and apolar forces for the entire molecule as well as force components for each atom'
      };

    for (let optVal in outputOptions){
      radioOptions.push(
        <Radio style={this.radioVertStyle} value={optVal}> {outputOptions[optVal]} </Radio>
      )
    }
    let outputGroup = 
      <Radio.Group name={outputNameField} defaultValue={this.state.parent_form_values.calcforce} onChange={this.handleParentFormChange}> {radioOptions} </Radio.Group>
    ;

    return this.renderCollapsePanel(header, outputGroup);
  }

  renderOutputScalar(){
    let header = 'OUTPUT OF SCALAR DATA CALCULATED DURING THE PB RUN:';
    let outputNameField = 'output_scalar';
    let checkboxOptions = [];
    let outputOptions = 
      { 
        // 'dx'  : 'OpenDX', 
        // 'avs' : 'AVS UCD',
        // 'uhbd': 'UBHD',

        'writecharge': 'Write out the biomolecular charge distribution in units of ec (multigrid only)',
        'writepot'   : 'Write out the electrostatic potential in units of kbT/ec (multigrid and finite element)',
        'writesmol'  : 'Write out the solvent accessibility defined by the molecular surface definition',
        'writesspl'  : 'Write out the spline-based solvent accessibility',
        'writevdw'   : 'Write out the van der Waals-based solvent accessibility',
        'writeivdw'  : 'Write out the inflated van der Waals-based ion accessibility',
        'writelap'   : 'Write out the Laplacian of the potential in units of kBT/ec/A2 (multigrid only)',
        'writeedens' : 'Write out the "energy density" in units of kBT/ec/A2 (multigrid only)',
        'writendens' : 'Write out the mobile ion number density for m ion species in units of M (multigrid only)',
        'writegdens' : 'Write out the mobile charge density for m ion species in units of e\u209C\u1d9c M (multigrid only)',
        'writedielx' : 'Write out the dielectric map shifted by 1/2 grid spacing in the x-direction',
        'writediely' : 'Write out the dielectric map shifted by 1/2 grid spacing in the y-direction',
        'writedielz' : 'Write out the dielectric map shifted by 1/2 grid spacing in the z-direction',
        'writekappa' : 'Write out the ion-accessibility kappa map',
      };

    for (let optVal in outputOptions){
      checkboxOptions.push(
        <Checkbox style={this.radioVertStyle} name={optVal} value={optVal}> {outputOptions[optVal]} </Checkbox>
      )
    }
    let outputGroup = 
      <Checkbox.Group name={outputNameField} value={this.state.parent_form_values.output_scalar} onChange={(e) => this.handleParentFormChange(e, outputNameField)}> {checkboxOptions} </Checkbox.Group>
    ;

    return this.renderCollapsePanel(header, outputGroup);
  }

  renderOutputFormat(){
    let header = 'FORMAT TO WRITE DATA:';
    let outputNameField = 'writeformat';
    let radioOptions = [];
    let outputOptions = 
      { 'dx'  : 'OpenDX', 
        'avs' : 'AVS UCD',
        'uhbd': 'UBHD'
      };

    for (let optVal in outputOptions){
      let disable_write_option = false
      let parent_form_values = this.state.parent_form_values
      if( optVal === 'uhbd' && !this.isTypeMultigrid() ){
        disable_write_option = true
        if( parent_form_values.writeformat === 'uhbd' ){
          // If current selection is uhbd, reset to dx
          parent_form_values.writeformat = 'dx'
          this.setState({ parent_form_values })
        }
      }
      if( optVal === 'avs' && !this.isTypeFiniteElement() ){
        disable_write_option = true
        if( parent_form_values.writeformat === 'avs' ){
          // If current selection is avs, reset to dx
          parent_form_values.writeformat = 'dx'
          this.setState({ parent_form_values })
        }
      }

      radioOptions.push(
        <Radio disabled={disable_write_option} value={optVal}> {outputOptions[optVal]} </Radio>
      )
    }
    let outputGroup = 
      <Radio.Group name={outputNameField} value={this.state.parent_form_values.writeformat} onChange={this.handleParentFormChange}> {radioOptions} </Radio.Group>
    ;

    return this.renderCollapsePanel(header, outputGroup);
  }

  /** Creates and returns the APBS configuration form.
   * @todo Create the submission form using APBS config from http://nbcr-222.ucsd.edu/pdb2pqr_2.1.1/ as a template 
   */
  renderConfigForm(){
    return(
      <Form action={window._env_.API_URL + "/submit/apbs"} method="POST" onSubmit={this.handleJobSubmit} name="thisform" encType="multipart/form-data">
      {/* <Form action={window._env_.API_URL + "/jobstatus?submitType=apbs"} method="POST" onSubmit={this.handleJobSubmit} name="thisform" encType="multipart/form-data"> */}
        {/** Load data from PQR file */}
        {this.renderPqrAutofillUpload()}

        {/** Choose the calculation method */}
        <Form.Item label='Calculation Type'>
          {/* <Collapse> */}
            {this.renderCalcChoices()}
          {/* </Collapse> */}
        </Form.Item>

        {/** Choose calculation method-specific options */}
        {this.renderMethodFormItems()}
        {/* <Form.Item label='Remove water from calculations and visualizations'>
          <Switch name='removewater' value='on'/>
        </Form.Item> */}

        {/** Choose whether to calculate electrostatic energy from PBE calculation */}
        <Form.Item label='Energy Calculations'>
          <Collapse>
            {this.renderCalcEnergy()}
          </Collapse>
        </Form.Item>

        {/** Choose whether to calculate electrostatic and apolar forces from PBE calculation */}
        <Form.Item label='Force Calculations'>
          <Collapse>
            {this.renderCalcForces()}
          </Collapse>
        </Form.Item>

        {/** Choose output of scalar data */}
        <Form.Item label='Scalar data output'>
          <Collapse>
            {this.renderOutputScalar()}
          </Collapse>
        </Form.Item>

        {/** Choose format of the data output */}
        <Form.Item label='Output'>
          <Collapse>
            {this.renderOutputFormat()}
          </Collapse>
        </Form.Item>

        {/** Where the submission button lies */}
        <Form.Item>
          <Col offset={20}>
          <Affix offsetBottom={100}>
            {this.renderSubmitButton()}
          </Affix>
          </Col>
        </Form.Item>

        {/** Hidden element holdovers from original website */}
        {/**   obscure to server-side later */}
        <input type='hidden' name='hiddencheck' value={this.state.hiddencheck} />
        <input type='hidden' name='pdb2pqrid' value={this.state.jobid} />
        <input type='hidden' name='mol' value={this.state.mol} />
      </Form>
    )
  }

  renderConfigFormTabular(){
    // console.log(this.state.parent_form_values.mol)
    return (
      <Form onSubmit={ (e) => this.handleNewJobSubmit(e)} layout="vertical">
      {/* <Form action={window._env_.API_URL + "/submit/apbs"} method="POST" onSubmit={this.handleJobSubmit} name="thisform" encType="multipart/form-data"> */}
      {/* <Form action={window._env_.API_URL + "/submit/apbs/json"} method="POST" onSubmit={this.handleNewJobSubmit} name="thisform" encType="multipart/form-data"> */}
        <Row>
          <Col span={22} offset={1}>
          {/* <Col span={21} offset={1}> */}
                {/* Render the registration button after files are uploaded */}
                {this.renderRegistrationButton()}

            <Tabs
              defaultActiveKey='1'
              tabPosition='top'
              // tabPosition='left'
              // style={{ height: 220 }}
            >
              <TabPane
                key="1" 
                forceRender={true} 
                tab={<span><UploadOutlined />Input</span>}
              >
                {/** Toggle to use an APBS infile rather than */}
                {/* {this.renderInfileUpload()} */}

                {/** Load data from PQR file */}
                {/* {this.renderPqrAutofillUpload()} */}

                {/** Choose the calculation method */}
                <Form.Item label='Calculation Type'>
                  {/* <Collapse> */}
                    {this.renderCalcChoices()}
                  {/* </Collapse> */}
                </Form.Item>
              </TabPane>

              <TabPane
                key="2" 
                forceRender={true} 
                tab={<span><SettingOutlined />{this.state.parent_form_values.type + ' Options'}</span>}
                // tab={<span><Icon type="setting" />Advanced Options</span>}
              >
                {/** Choose calculation method-specific options */}
                {/* {this.calc_method_component} */}
                {this.renderMethodFormItems()}

              </TabPane>

              <TabPane
                key="3"
                forceRender={true}
                tab={<span><SettingOutlined />Misc Options</span>}
              >
                {/** Choose whether to remove water from the calculations */}
                <Form.Item>
                  <Checkbox 
                    name='removewater' 
                    value={this.state.parent_form_values.removewater} 
                    onChange={(e) => this.handleParentFormChange(e, 'removewater', !this.state.parent_form_values.removewater)}
                  >
                    Remove water from calculations and visualization
                  </Checkbox>
                </Form.Item>
                {/* <Form.Item label='Remove water from calculations and visualizations'>
                  <Switch name='removewater' value='on' checked={true}/>
                </Form.Item> */}

                {/** Choose whether to calculate electrostatic energy from PBE calculation */}
                <Form.Item label='Energy Calculations'>
                  <Collapse>
                    {this.renderCalcEnergy()}
                  </Collapse>
                </Form.Item>

                {/** Choose whether to calculate electrostatic and apolar forces from PBE calculation */}
                <Form.Item label='Force Calculations'>
                  <Collapse>
                    {this.renderCalcForces()}
                  </Collapse>
                </Form.Item>

              </TabPane>

              <TabPane
                key="4" 
                forceRender={true} 
                tab={<span><ExportOutlined />Output Settings</span>}
              >
                {/** Choose output of scalar data */}
                <Form.Item label='Scalar data output'>
                  <Collapse>
                    {this.renderOutputScalar()}
                  </Collapse>
                </Form.Item>

                {/** Choose format of the data output */}
                <Form.Item label='Output'>
                  <Collapse>
                    {this.renderOutputFormat()}
                  </Collapse>
                </Form.Item>
              </TabPane>

            </Tabs>
          </Col>
        </Row>


        {/** Where the submission button lies */}
        <Form.Item>
          <Col offset={20}>
          <Affix offsetBottom={100}>
            {this.renderSubmitButton()}
          </Affix>
          </Col>
        </Form.Item>

        {/** Hidden element holdovers from original website */}
        {/**   obscure to server-side later */}
        <input type='hidden' name='hiddencheck' value={this.state.parent_form_values.hiddencheck} />
        <input type='hidden' name='pdb2pqrid' value={this.state.jobid} />
        <input type='hidden' name='mol' value={this.state.parent_form_values.mol} />
      </Form>
    );
  }
      
  renderConfigFormInfile(){
    // console.log(this.state.parent_form_values.mol)
    let clickable_button = false
    if( this.state.v2_form_values.filename !== null && this.state.v2_form_values.support_files.length > 0 ){
      clickable_button = true
    }
    return (
      <Form onSubmit={ (e) => this.handleNewJobSubmit(e)} layout="vertical">
      {/* <Form action={window._env_.API_URL + "/submit/apbs"} method="POST" onSubmit={this.handleJobSubmit} name="thisform" encType="multipart/form-data"> */}
      {/* <Form action={window._env_.API_URL + "/submit/apbs/json"} method="POST" onSubmit={this.handleNewJobSubmit} name="thisform" encType="multipart/form-data"> */}
        <Row>
          <Col span={22} offset={1}>
          {/* <Col span={21} offset={1}> */}
            <Tabs
              defaultActiveKey='1'
              tabPosition='top'
              // tabPosition='left'
              // style={{ height: 220 }}
            >
              <TabPane
                key="1" 
                forceRender={true} 
                tab={<span><UploadOutlined />Input</span>}
              >
                {/** Toggle to use an APBS infile rather than */}
                {this.renderInfileUpload()}

                {/* Render the registration button after files are uploaded */}
                {this.renderRegistrationButton()}
              </TabPane>
            </Tabs>
          </Col>
        </Row>

        {/** Where the submission button lies */}
        <Form.Item>
          <Col offset={20}>
          <Affix offsetBottom={100}>
            {this.renderSubmitButton(clickable_button)}
          </Affix>
          </Col>
        </Form.Item>

      </Form>
    );
  }
      
  render(){
    let rendered_config = null;
    let rendered_workflow = null;
    if ( this.state.successful_submit ){
      rendered_config = this.redirectToStatusPage('apbs')
    }
    else{
      if( this.props.jobid ){
        rendered_config = this.renderConfigFormTabular()
        rendered_workflow = <WorkflowHeader currentStep={2} stepList={WORKFLOW_TYPES.APBS}/>
      }
      else{
        rendered_config = this.renderConfigFormInfile()
        rendered_workflow = <WorkflowHeader currentStep={0} stepList={WORKFLOW_TYPES.APBS_ONLY}/>
      }
    }



    return(
      <Layout id="apbs" style={{ padding: '16px 0', marginBottom: 5, background: '#fff', boxShadow: "2px 4px 3px #00000033" }}>
          {/* {this.renderSidebar()} */}
          <Layout>
            <Content style={{ background: '#fff', padding: 16, paddingTop: 0, margin: 0, minHeight: 280 }}>
              {/* Content goes here */}
              {/* {this.renderConfigForm()} */}
              {/* {this.renderConfigFormTabular()} */}
              {/* {this.renderConfigFormInfile()} */}
              {rendered_workflow}<br/>
              {rendered_config}
            </Content>
          </Layout>
        </Layout>    
    );
  }
}

export default ConfigAPBS;