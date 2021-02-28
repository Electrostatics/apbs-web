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
import { Redirect } from 'react-router-dom';
import ConfigForm from './utils/formutils';
import { MgAuto, MgPara, MgManual, FeManual, MgDummy
       } from './apbs/calculationtypes';

const { Content, Sider } = Layout;
const Panel = Collapse.Panel;
const TabPane = Tabs.TabPane;

/**
 * Component defining how the APBS job configuration page is rendered
 */
class ConfigAPBS extends ConfigForm {

  constructor(props){
    super(props);
    if( window._env_.GA_TRACKING_ID !== "" )
      ReactGA.pageview(window.location.pathname + window.location.search)

    this.state = {
      job_submit: false,
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
      expected_input_files: [],
      show_apbs_misc_upload: false,

      v2_form_values: {
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
              onClick={() => this.sendRegisterClickEvent('apbs')}
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
  handleNewJobSubmit(e, self){
    e.preventDefault();
    console.log('WE IN NEWJOBSUBMIT')
    if(self.state.job_submit)
      alert("Job is submitted. Redirecting to job status page");
    else{
      self.setState({
        job_submit: true
      })

      // Obtain a job id if not within props
      // if(self.state.jobid == undefined)
      // self.getNewJobID()

      // let form_post_url = window._env_.API_URL + "/submit/apbs/json";
      // let form_post_url = window._env_.WORKFLOW_URL + "/submit/apbs/json";
      // let form_post_url = `${window._env_.WORKFLOW_URL}/api/workflow/${self.state.jobid}/apbs?task=1`;
      let form_post_url = `${window._env_.WORKFLOW_URL}/${self.state.jobid}/apbs?`;
      console.log(form_post_url)

      let payload;
      if ( self.props.jobid ){
        let combined_form_data = self.state.parent_form_values;
        // console.log(self.state.parent_form_values);
        // console.log(self.state.child_form_values);
        Object.assign(combined_form_data, self.state.child_form_values);
        // console.log(combined_form_data);
        payload = {
          form : combined_form_data
        }
      }
      else{
        payload = {
          form : self.state.v2_form_values
        }
      }
      console.log(payload)
      
      // Submit the form to the workflow service
      let form_post_headers = {
        'x-requested-with': '',
        'Content-Type': 'application/json'
      }

      if( self.hasAnalyticsId() ){
        ReactGA.ga(function(tracker){
          let clientId = tracker.get('clientId')
          // console.log('GA client ID: ' + clientId)
          form_post_headers['X-APBS-Client-ID'] = clientId
        })  
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

      }else{
        // Add file names and data to token request payloads
        for( let file of [].concat( self.state.infileList, self.state.readfileList ) ){
          upload_file_names.push( file.name )
          upload_file_data[ file.name ] = file.originFileObj
        }
  
        // Add job config file/data to upload lists
        upload_file_names.push( job_file_name )
        upload_file_data[job_file_name] = JSON.stringify(payload)
  
        // Create upload payload
        token_request_payload = {
          file_list: upload_file_names,
        }

        // Attempt to upload all input files
        fetch(window._env_.API_TOKEN_URL,{
          method: 'POST',
          body: JSON.stringify(token_request_payload)
        })
          .then( response => response.json() )
          .then( data => {
            // TODO: uplift the following into a function (formutils.js); use in PDB2PQR as well
            let jobid = data['job_id']
            let url_table = data['urls']

            // Create payload for job config file (*.job.json)
            let fetch_list = []
            for( let file_name of Object.keys(url_table) ){
              let presigned_url = url_table[file_name]
    
              // Add fetch to promise list
              let body = new FormData()
              body.append('file', upload_file_data[file_name])
              fetch_list.push(
                fetch(presigned_url,{
                  method: 'PUT',
                  body: upload_file_data[file_name],
                  // body: body,
                  headers: {
                    'Content-Type': '', // Removed in order to successfully PUT to S3
                    // 'Content-Length': upload_file_data[file_name].size
                  }
                })
              )
            }

            let successful_submit = true
            Promise.all( fetch_list )
              .then( all_responses => {
                // Check response codes of each upload response
                for( let response of all_responses ){
                  if( response.status < 200 || response.status >= 300 ){
                    successful_submit = false
                    break
                  }
                }
                // Might do additional stuff here
              })
              .catch((error) => {
                console.error('Error: ', error)
                successful_submit = false    
              })
              .finally(() => {
                // Set flag to redirect to job status page
                self.setState({ 
                  jobid: jobid,
                  successful_submit: successful_submit,
                  job_submit: false,
                })                
              })
    
          })
      }  

      // let successful_submit = false
      // fetch(form_post_url, {
      //   method: 'POST',
      //   body: JSON.stringify(payload),
      //   headers: form_post_headers,
      // })
      //   // .then(response => response.json())
      //   .then(function(response) {
      //     if (response.status === 202){
      //       successful_submit = true
      //     }else if(response.status >= 400){
      //       successful_submit = false
      //       self.setState({ job_submit: false })
      //     }
      //     return response.json()
      //   })
      //   .then(data => {
      //     self.setState({ successful_submit: successful_submit })
      //     console.log(data)
      //     // window.location.assign(`/jobstatus?jobtype=apbs&jobid=${self.state.jobid}`)
      //     if ( successful_submit ){
      //       console.log('Success: ', data)
      //     }else{
      //       message.error(data['error'])
      //     }
      //   })
      //   .catch(error => console.error('Error: ', error))
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
    let server_domain = window._env_.API_URL;

    console.log('jobid: '+ jobid)
    console.log('comp: ')
    // console.log(self.calc_method_component)
    // this.calc_method_component = this.renderMethodFormItems()
    // console.log(server_domain.concat('/api/autofill/jobs/apbs/',jobid))
    console.log(`${window._env_.AUTOFILL_URL}/${jobid}/apbs`)
    // console.log(`${window._env_.AUTOFILL_URL}/api/autofill/${jobid}/apbs`)

    fetch(`${window._env_.AUTOFILL_URL}/${jobid}/apbs`)
    // fetch(`${window._env_.AUTOFILL_URL}/api/autofill/${jobid}/apbs`)
      .then(response => response.json())
      .then(data => {
        console.log(data)

        self.setState({
          autofill_data: data,
          did_fetch: true,
        })
        // for(let key in data){
        //   console.log(key.concat(':\n    ', data[key],'\n'))
        // }
        
        console.log(data)
      })
      .catch(error => console.error(error));
    self.handleParentFormChange({}, 'pdb2pqrid', jobid)
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

  // updateFormValues = 

  renderInfileUpload(){
    return (
      <div>
          <Form.Item label="Choose the APBS input file">
            <Upload
              name='file_data'
              accept='.in'
              action={`${window._env_.STORAGE_URL}/${this.state.jobid}`}
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
              action={`${window._env_.STORAGE_URL}/${this.state.jobid}`}
              fileList={this.state.readfileList}
              beforeUpload={ (e) => this.inspectReadfile(e, this) }
              onChange={ (e) => this.handleReadfileUpload(e, this) }
              rules={[
                {
                  required: true,
                  message: `Please upload supporting files ${this.state.expected_input_files}`,
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
    self.setState({ infileList: info.fileList.slice(-1) })
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
            let expected_input_files = self.extractAdditionalInputFiles( readfile_text )
            // TODO: If no READ section is found, return false (don't upload)

            // Reset file list if supporting files are already selected
            let readfileList = self.state.readfileList
            if( self.state.readfileList.length > 0 ){
              readfileList = []
            }

            // Update state
            self.setState({ 
              expected_input_files: expected_input_files,
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
    
    // Show message error if file not in expected support files
    if( !self.state.expected_input_files.includes(info.file.name) ){
      message.error(`Cannot upload ${info.file.name}. Please upload file(s) defined in ${self.state.v2_form_values['filename']}: ${self.state.expected_input_files}.`);
      return
    }

    // have file list show most recent upload
    self.setState({ readfileList: info.fileList })
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
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />

      case "mg-para":
        return <MgPara   
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />

      case "mg-manual":
        return <MgManual 
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />

      case "fe-manual":
        return <FeManual 
                  autofill={this.state.autofill_data} 
                  form_values={this.state.child_form_values} 
                  onFormChange={this.handleChildFormChange} />

      case "mg-dummy":
        return <MgDummy  
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
      radioOptions.push(
        <Radio value={optVal}> {outputOptions[optVal]} </Radio>
      )
    }
    let outputGroup = 
      <Radio.Group name={outputNameField} defaultValue={this.state.parent_form_values.writeformat} onChange={this.handleParentFormChange}> {radioOptions} </Radio.Group>
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
      <Form onSubmit={ (e) => this.handleNewJobSubmit(e, this)} layout="vertical">
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
                  <Checkbox name='removewater' value='on'>Remove water from calculations and visualizations</Checkbox>
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
    return (
      <Form onSubmit={ (e) => this.handleNewJobSubmit(e, this)} layout="vertical">
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
            {this.renderSubmitButton()}
          </Affix>
          </Col>
        </Form.Item>

      </Form>
    );
  }
      
  render(){
    let rendered_config = null;
    if ( this.state.successful_submit ){
      rendered_config = <Redirect to={`/jobstatus?jobtype=apbs&jobid=${this.state.jobid}`}/>
    }
    else{
      if( this.props.jobid )
        rendered_config = this.renderConfigFormTabular()
      else
        rendered_config = this.renderConfigFormInfile()
    }



    return(
      <Layout id="apbs" style={{ padding: '16px 0', marginBottom: 5, background: '#fff', boxShadow: "2px 4px 3px #00000033" }}>
          {/* {this.renderSidebar()} */}
          <Layout>
            <Content style={{ background: '#fff', padding: 16, margin: 0, minHeight: 280 }}>
              {/* Content goes here */}
              {/* {this.renderConfigForm()} */}
              {/* {this.renderConfigFormTabular()} */}
              {/* {this.renderConfigFormInfile()} */}
              {rendered_config}
            </Content>
          </Layout>
        </Layout>    
    );
  }
}

export default ConfigAPBS;