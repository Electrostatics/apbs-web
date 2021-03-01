import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css'
import { UploadOutlined, FormOutlined } from '@ant-design/icons';
import { Form } from 'antd';
// import { Form } from '@ant-design/compatible';
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
  Spin,
  message,
} from 'antd';
import { Redirect } from 'react-router-dom';
import ConfigForm from './utils/formutils';
// import '../styles/configJob.css'
const { Content, Sider } = Layout;

const OptionsMapping = {
  'atomsnotclose'   : 'DEBUMP',
  'optimizeHnetwork': 'OPT',
  'assignfrommol2'  : 'LIGANDCHECK',
  'makeapbsin'      : 'INPUT',
  'keepchainids'    : 'CHAIN',
  'insertwhitespace': 'WHITESPACE',
  'maketypemap'     : 'TYPEMAP',
  'neutralnterminus': 'NEUTRALN',
  'neutralcterminus': 'NEUTRALC',
  'removewater'     : 'DROPWATER',
}

/**
 * Component defining how the PDB2PQR job configuration page is rendered
 */
class ConfigPDB2PQR extends ConfigForm{

  constructor(props){
    super(props);
    // if( window._env_.GA_TRACKING_ID !== "" ) {
    if( this.hasAnalyticsId() ){
      ReactGA.pageview(window.location.pathname + window.location.search)
    }

    this.state = {
      
      pdbFileList: [],
      userffFileList: [],
      namesFileList: [],
      ligandFileList: [],

      pdb_upload_hidden: true,
      ff_upload_hidden: true,
      mol2_upload_hidden: true,
      only_parse: false,
      no_NC_terminus: false,

      form_values: {
        PDBFILE:        "",
        USERFFFILE:     "",
        NAMESFILE:      "",
        LIGANDFILE:     "",

        PDBID:          "",
        PDBSOURCE:      "ID",
        PH:             7,
        PKACALCMETHOD:  "propka",
        FF:             "parse",
        FFOUT:          "internal",
        OPTIONS:        [ 'atomsnotclose', 'optimizeHnetwork', 'makeapbsin', 'removewater' ],
      },

      job_submit: false,
      successful_submit: false,

      // Registration button states
      show_register_button: false,
    }
    // this.handleJobSubmit = this.handleJobSubmit.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this)
    // this.renderConfigForm = this.renderConfigForm.bind(this)
  }

  componentDidMount(){
    if(this.props.jobid){
      this.setState({ jobid: this.props.jobid })
    }
    else{
      // AWS: We get new jobid at submission time
      // this.getNewJobID()
    }
  }

  /** Updates current state of form values when changed */
  handleFormChange = (e, nameString) => {
    let itemName  = (nameString === undefined) ? e.target.name : nameString;
    let itemValue = (e.target !== undefined) ? e.target.value : e;
    // let itemValue = e.target.value;
    // let itemName  = e.target.name;

    // Update form values 
    let form_values = this.state.form_values;
    form_values[itemName] = itemValue;
    this.setState({ form_values })

    console.log(itemName +": "+ itemValue);
    switch(itemName){
      case "PDBSOURCE":
        // this.setState({
        //   PDBSOURCE: itemValue
        // });
        if( itemValue == "UPLOAD" ){
          this.togglePdbUploadButton(true)
        }else{ this.togglePdbUploadButton(false) }
        // (itemValue == "UPLOAD") ? this.togglePdbUploadButton(true) : this.togglePdbUploadButton(false);
        break;
        
      case "PDBID":
        // TODO: 2021/03/01, Elvis - check if PDB ID exists in RCSB
        this.toggleRegisterButton(true)
        break;

      case "PH":
        // this.setState({
        //   PH: itemValue
        // });
        break;

      case "PKACALCMETHOD":
        // this.setState({
        //   PKACALCMETHOD: itemValue
        // });
        (itemValue == "pdb2pka") ? this.toggleMustUseParse(true) : this.toggleMustUseParse(false);
        break;

      case "FF":
        // this.setState({
        //   FF: itemValue
        // });
        (itemValue != "parse")? this.toggleDisableForNoParse(true) : this.toggleDisableForNoParse(false);
        (itemValue == "user") ? this.toggleUserForcefieldUploadButton(true) : this.toggleUserForcefieldUploadButton(false);
        this.uncheckTerminusOptions()
        break;

      case "FFOUT":
        // this.setState({
        //   FFOUT: itemValue
        // });
        break;
        
      case "OPTIONS":
        // this.setState({
        //   OPTIONS: itemValue
        // });
        (itemValue.includes("assignfrommol2")) ? this.toggleMol2UploadButton(true) : this.toggleMol2UploadButton(false);
        (["neutralnterminus", "neutralcterminus"].some(opt=>itemValue.includes(opt))) ? this.toggleMustUseParse(true) : this.toggleMustUseParse(false);
        break;
    }
  }

  /** If user tries submitting job again, raise alert. */
  /** Prepare form data to be sent via JSON request */
  // handleJobSubmit = (e, self) => {
  newHandleJobSubmit = values => {
    // e.preventDefault();
    let self = this
    if(this.state.job_submit)
      alert("Job is submitted. Redirecting to job status page");
    else{
      console.log("we're past rule checks. About to submit form:", values)
      this.setState({
        job_submit: true
      })

      // // Obtain a job id if not within props
      // if(self.state.jobid == undefined){
      //   self.getNewJobID()
      // }

      let form_and_options = this.state.form_values;
      for(let option of form_and_options['OPTIONS']){
        form_and_options[OptionsMapping[option]] = option
      }

      // let form_post_url = `${window._env_.WORKFLOW_URL}/api/workflow/${self.state.jobid}/pdb2pqr`;
      let form_post_url = `${window._env_.WORKFLOW_URL}/${this.state.jobid}/pdb2pqr`;
      let payload = {
        form : this.state.form_values
      }
      
      let form_post_headers = {
        'x-requested-with': '',
        'Content-Type': 'application/json'
      }

      if( this.hasAnalyticsId() ){
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
      let job_file_name = 'pdb2pqr-job.json'
      let upload_file_names = []
      let upload_file_data = {}
      if( this.state.form_values['PDBFILE'] !== "" ){
        upload_file_names.push( this.state.form_values['PDBFILE'] )
        upload_file_data[this.state.form_values['PDBFILE'] ] = this.state.pdbFileList[0].originFileObj
      }
      if( this.state.form_values['USERFFFILE'] !== "" ) {
        upload_file_names.push( this.state.form_values['USERFFFILE'] )
        upload_file_data[this.state.form_values['USERFFFILE'] ] = this.state.userffFileList[0].originFileObj
      }
      if( this.state.form_values['NAMESFILE'] !== "" )  {
        upload_file_names.push( this.state.form_values['NAMESFILE'] )
        upload_file_data[this.state.form_values['NAMESFILE'] ] = this.state.namesFileList[0].originFileObj
      }
      if( this.state.form_values['LIGANDFILE'] !== "" ) {
        upload_file_names.push( this.state.form_values['LIGANDFILE'] )
        upload_file_data[this.state.form_values['LIGANDFILE'] ] = this.state.ligandFileList[0].originFileObj
      }

      // Add job config file/data to upload lists
      upload_file_names.push( job_file_name )
      upload_file_data[job_file_name] = JSON.stringify(payload)

      // Create upload payload
      let token_request_payload = {
        file_list: upload_file_names,
      }

      console.log( upload_file_names )

      
      // Attempt to upload all input files
      fetch(window._env_.API_TOKEN_URL,{
        method: 'POST',
        body: JSON.stringify(token_request_payload)
      })
      .then( response => response.json() )
      .then( data => {
        let jobid = data['job_id']
        let url_table = data['urls']

        // Create payload for job config file (*job.json)
        // For every URL
        //    - fetch file to S3
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
        // let successful_submit = false
        Promise.all( fetch_list )
          .then(function(all_responses){
            // Check response codes of each upload response
            for( let response of all_responses ){
              if( response.status < 200 || response.status >= 300 ){
                successful_submit = false
                break
              }
            }

            // Might do additional stuff here

          })
          .catch(error => {
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

      // // Submit form data to the workflow service
      // let successful_submit = false
      // fetch(form_post_url, {
      //   method: 'POST',
      //   body: JSON.stringify(payload),
      //   headers: {
      //     'x-requested-with': '',
      //     'Content-Type': 'application/json'
      //   }
      // })
      //   .then(function(response) {
      //     if (response.status === 202){
      //       successful_submit = true
      //     }else if(response.status >= 400){
      //     // }else if(response.status === 400 || response.status === 500){
      //       successful_submit = false
      //       this.setState({ job_submit: false })
      //     }
      //     return response.json()
      //   })
      //   .then(data => {
      //     this.setState({ successful_submit: successful_submit })
      //     if ( successful_submit ){
      //       console.log('Success: ', data)
      //       // window.location.assign(`/jobstatus?jobtype=pdb2pqr&jobid=${self.state.jobid}`)
      //     }else{
      //       message.error(data['error'])
      //     }
      //   })
      //   .catch(error => console.error('Error: ', error))
    }
  }

  /** If user tries submitting job again, raise alert. */
  /** Prepare form data to be sent via JSON request */
  handleJobSubmit = (e, self) => {
    e.preventDefault();
    if(self.state.job_submit)
      alert("Job is submitted. Redirecting to job status page");
    else{
      self.setState({
        job_submit: true
      })

      // // Obtain a job id if not within props
      // if(self.state.jobid == undefined){
      //   self.getNewJobID()
      // }

      let form_and_options = self.state.form_values;
      for(let option of form_and_options['OPTIONS']){
        form_and_options[OptionsMapping[option]] = option
      }

      // let form_post_url = `${window._env_.WORKFLOW_URL}/api/workflow/${self.state.jobid}/pdb2pqr`;
      let form_post_url = `${window._env_.WORKFLOW_URL}/${self.state.jobid}/pdb2pqr`;
      let payload = {
        form : self.state.form_values
      }

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
      let job_file_name = 'pdb2pqr-job.json'
      let upload_file_list = []
      let upload_file_data = {}
      if( self.state['PDBFILE'] !== "" ){
        upload_file_list.push( self.state['PDBFILE'] )
        upload_file_data[self.state['PDBFILE'] ] = self.state.pdbFileList[0]
      }
      if( self.state['USERFFFILE'] !== "" ) {
        upload_file_list.push( self.state['USERFFFILE'] )
        upload_file_data[self.state['USERFFFILE'] ] = self.state.userffFileList[0]
      }
      if( self.state['NAMESFILE'] !== "" )  {
        upload_file_list.push( self.state['NAMESFILE'] )
        upload_file_data[self.state['NAMESFILE'] ] = self.state.namesFileList[0]
      }
      if( self.state['LIGANDFILE'] !== "" ) {
        upload_file_list.push( self.state['LIGANDFILE'] )
        upload_file_data[self.state['LIGANDFILE'] ] = self.state.ligandFileList[0]
      }

      upload_file_list.push( job_file_name )
      upload_file_data[job_file_name] = payload

      let token_request_payload = {
        file_list: upload_file_list,
      }

      console.log( upload_file_list )

      
      // Attempt to upload all input files
      fetch(window._env_.API_TOKEN_URL,{
        method: 'GET',
        body: JSON.stringify(token_request_payload)
      })
      .then( response => response.json() )
      .then( data => {
        let jobid = data['job_id']
        let url_table = data['urls']

        // Create payload for job config file (*job.json)
        // For every URL
        //    - fetch file to S3
        for( let file_name of Object.keys(url_table) ){
          let presigned_url = url_table[file_name]
          let fetch_list = []

          // Add fetch to rpmist list
          fetch_list.push(
            fetch(presigned_url,{
              method: 'PUT',
              body: upload_file_data[file_name]
            })
          )

          let successful_submit = true
          Promise.all( fetch_list )
            .then(function(all_response){
              // Check response codes of each upload response
              for( let response of all_response ){
                if( response.status < 200 && response.status >= 300 ){
                  successful_submit = false
                  break
                }
              }

              // Might do additional stuff here

              // Set flag to redirect to job status page
              self.setState({ successful_submit: successful_submit })
            })
            .catch(error => console.error('Error: ', error))
        }
      })

      // // Submit form data to the workflow service
      // let successful_submit = false
      // fetch(form_post_url, {
      //   method: 'POST',
      //   body: JSON.stringify(payload),
      //   headers: form_post_headers,
      // })
      //   .then(function(response) {
      //     if (response.status === 202){
      //       successful_submit = true
      //     }else if(response.status >= 400){
      //     // }else if(response.status === 400 || response.status === 500){
      //       successful_submit = false
      //       self.setState({ job_submit: false })
      //     }
      //     return response.json()
      //   })
      //   .then(data => {
      //     self.setState({ successful_submit: successful_submit })
      //     if ( successful_submit ){
      //       console.log('Success: ', data)
      //       // window.location.assign(`/jobstatus?jobtype=pdb2pqr&jobid=${self.state.jobid}`)
      //     }else{
      //       message.error(data['error'])
      //     }
      //   })
      //   .catch(error => console.error('Error: ', error))
    }
  }

  
  togglePdbUploadButton(show_upload){
    this.setState({
      pdb_upload_hidden: !show_upload
    });
  }
  toggleUserForcefieldUploadButton(show_upload){
    // console.log(this.state.ff_upload_hidden)
    this.setState({
      ff_upload_hidden: !show_upload
    });
  }
  toggleMol2UploadButton(show_upload){
    this.setState({
      mol2_upload_hidden: !show_upload
    });
  }

  toggleMustUseParse(do_disable){
    if(do_disable){
      let form_values = this.state.form_values
      form_values["FF"] = "parse";
      this.setState({
        form_values,
        only_parse: do_disable,
        // FF: "parse",
        ff_upload_hidden: true,
        no_NC_terminus: !do_disable
      })
    }
    this.setState({
      only_parse: do_disable,
    })
  }
  toggleDisableForNoParse(do_disable){
    this.setState({
      no_NC_terminus: do_disable
    })
    if(do_disable == false){
      this.uncheckTerminusOptions()
    }
  }

  uncheckTerminusOptions(){
      let new_OPTIONS = [];
      // this.state.form_values.OPTIONS.forEach()
      for(let element of this.state.form_values.OPTIONS){
        if( !["neutralnterminus", "neutralcterminus"].some(opt => {return element == opt;}) ){
          console.log(element);
          new_OPTIONS.push(element)
        }
      }

      let form_values = this.state.form_values
      form_values["OPTIONS"] = new_OPTIONS;
      this.setState({ form_values })
  
      // this.setState({
      //   OPTIONS: new_OPTIONS
      // }) 
  }
  // togglePdbUploadButton = (e) => {
  //   this.setState({
  //     pdb_upload_hidden: !this.state.pdb_upload_hidden
  //   })
  // }

  beforeUpload(file, self, file_type){
    console.log("we in beforeUpload")
    // console.log(file)
    // console.log(file.name.endsWith('.pdb'))
    let form_values = self.state.form_values;
    if( file_type === 'pdb' ){
      if(!file.name.endsWith('.pdb')){
        message.error('You must upload a PDB (*.pdb) file!');
        return false;
      }
      else{
        form_values['PDBFILE'] = file.name;
      }
    }
    else if( file_type === 'userff' ){
      if(!file.name.endsWith('.DAT')){
        message.error('You must upload a Force Field (*.DAT) file!');
        return false;
      }
      else{
        form_values['USERFFFILE'] = file.name;
      }      
    }
    else if( file_type === 'names' ){      
      if(!file.name.endsWith('.names')){
        message.error('You must upload a Names (*.names) file!');
        return false;
      }
      else{
        form_values['NAMESFILE'] = file.name;
      }
    }
    else if( file_type === 'ligand' ){
      if(!file.name.endsWith('.mol2')){
        message.error('You must upload a Ligand (*.mol2) file!');
        return false;
      }
      else{
        form_values['LIGANDFILE'] = file.name;
      }
    }

    self.setState({ form_values })
    // return true;
    return false;
  }

  renderRegistrationButton(){
    if( this.state.show_register_button ){
      return(
        <div>
          For continued support of this server, please register your use of this software:
          <br/>
          <a href={window._env_.REGISTRATION_URL} target="_blank" rel="noopener noreferrer">
            <Button
              className='registration-button' 
              type="default"  
              // size='large' 
              // shape='round'
              icon={<FormOutlined />}
              onClick={() => this.sendRegisterClickEvent('pdb2pqr')}
            >
              Register Here
            </Button>
          </a>
          <br/>
          <br/>
        </div>
      )
    }
  }

  renderPdbSourceInput(){
    // if(this.state.pdb_upload_hidden) return;
    let return_element = null
    if(this.state.form_values.PDBSOURCE == 'ID'){
      return_element = 
          <Form.Item
          name="pdbid"
          label="Please enter a PDB ID"
          rules={[
            {
              required: true,
              message: 'Please input a PDB ID',
            },
          ]}>

            <Input name="PDBID" placeholder="PDB ID" maxLength={4} onChange={this.handleFormChange}/>
            {/* <Input name="PDBID" placeholder="PDB ID" maxLength={4}/> */}
          </Form.Item>
    }
    else{
      let upload_url = `${window._env_.AUTOFILL_URL}/upload/${this.state.jobid}/pdb2pqr`
      console.log(upload_url)
      return_element = 
        <Form.Item
          name="pdbfile"
          label="Please upload a PDB file"
          rules={[
            {
              required: true,
              message: 'Please upload a PDB file',
            },
          ]}
        >
          <Upload 
            name="file"
            accept=".pdb"
            action={upload_url}
            fileList={this.state.pdbFileList}
            beforeUpload={ (e) => this.beforeUpload(e, this, 'pdb')}
            onChange={ (e) => this.handleUpload(e, this, 'pdb') }
            // onChange={ (e) => this.handlePdbUpload(e, this) }
          >
            <Button icon={<UploadOutlined />}>
              Select File
            </Button>
          </Upload>
        </Form.Item>

        // return_element = <input className='ant-button' type="file" name="PDB" accept=".pdb"/>
    }

    // return return_element
    return (
      <Row>
        <Col span={4}>
          {return_element}
        </Col>
      </Row> 
    );
  }

  handlePdbUpload(info, self){
    if (info.file.status !== 'uploading') {
      console.log('uploading')
    }
    if (info.file.status === 'done') {
      message.success(`${info.file.name} file uploaded successfully`);
      console.log(`${info.file.name} file uploaded successfully`)
      // self.setState({
      //   jobid: info.file.response['job_id'],
      // })
      // self.fetchAutofillData(this.state.jobid);
    }
    else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }

    console.log(self.state.pdbFileList)
    self.setState({ pdbFileList: info.fileList.slice(-1) })
    console.log(self.state.pdbFileList)
  }

  handleUpload(info, self, file_type){
    if (info.file.status !== 'uploading') {
      console.log('uploading')
    }
    if (info.file.status === 'done') {
      message.success(`${info.file.name} file uploaded successfully`);
      console.log(`${info.file.name} file uploaded successfully`)
    }
    else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }

    if( file_type == 'pdb' ){
      self.setState({
        pdbFileList: info.fileList.slice(-1),
        show_register_button: true,
      })
    } 
    else if( file_type == 'userff' ) self.setState({ userffFileList: info.fileList.slice(-1) })
    else if( file_type == 'names' )  self.setState({ namesFileList: info.fileList.slice(-1) })
    else if( file_type == 'ligand' ) self.setState({ ligandFileList: info.fileList.slice(-1) })

    // console.log(self.state.pdbFileList)
    // console.log(self.state.pdbFileList)
  }

  renderUserForcefieldUploadButton(){
    // console.log("hello world")
    if(this.state.ff_upload_hidden) { return; }
    else{
      let upload_url = `${window._env_.AUTOFILL_URL}/upload/${this.state.jobid}/pdb2pqr`
      let userff_upload = 
        <Upload
          name="file"
          accept=".DAT"
          action={upload_url}
          fileList={this.state.userffFileList}
          beforeUpload={ (e) => this.beforeUpload(e, this, 'userff')}
          onChange={ (e) => this.handleUpload(e, this, 'userff') }
        >
          <Button icon={<UploadOutlined />}> Select File </Button>
        </Upload>

      let names_upload = 
        <Upload
          name="file"
          accept=".names"
          action={upload_url}
          fileList={this.state.namesFileList}
          beforeUpload={ (e) => this.beforeUpload(e, this, 'names')}
          onChange={ (e) => this.handleUpload(e, this, 'names') }
        >
          <Button icon={<UploadOutlined />}> Select File </Button>
        </Upload>
      return(
        <div>
          {/* Forcefield file: <input type="file" name="USERFF" />
          Names file (*.names): <input type="file" name="USERNAMES" accept=".names" /> */}

          Forcefield file: {userff_upload}
          Names file (*.names): {names_upload}
        </div>
      );
    }
  }
  // handleUserForcefieldUpload(info, self){}

  renderMol2UploadButton(){
    if(this.state.mol2_upload_hidden) return;
    else{
      let upload_url = `${window._env_.AUTOFILL_URL}/upload/${this.state.jobid}/pdb2pqr`
      let ligand_upload = 
      <Upload
        name="file"
        accept=".mol2"
        action={upload_url}
        fileList={this.state.ligandFileList}
        beforeUpload={ (e) => this.beforeUpload(e, this, 'ligand')}
        onChange={ (e) => this.handleUpload(e, this, 'ligand') }
      >
        <Button icon={<UploadOutlined />}> Select File </Button>
      </Upload>


      return(
        // <input type="file" name="LIGAND"/>
        <div>
          {ligand_upload}
        </div>
      )
    }
  }
  // handleMol2Upload(info, self){}


  /** Creates and returns the sidebar component. */
  renderSidebar(){
    return(
      <Affix offsetTop={80}>
      {/* <Affix offsetTop={16}> */}
      <Sider width={200} style={{ background: '#ffffff' }}>
        <Menu
        // theme="dark"
        mode="inline"
        defaultSelectedKeys={['which_pdb']}
        style={{ height: '100%', borderRight: 0 }}
        >
          <Menu.Item key="which_pdb"    ><a href="#pdbid">        PDB ID Entry </a></Menu.Item>
          <Menu.Item key="which_pka"    ><a href="#pka">          pKa Settings (optional) </a></Menu.Item>
          <Menu.Item key="which_ff"     ><a href="#forcefield">   Forcefield </a></Menu.Item>
          <Menu.Item key="which_output" ><a href="#outputscheme"> Output Naming Scheme </a></Menu.Item>
          <Menu.Item key="which_options"><a href="#addedoptions"> Additional Options </a></Menu.Item>
          {/* <Menu.Item key="submission"     href="#submission"> Start Job </Menu.Item> */}
          {/* <Menu.Item key="submission" style={{ background: '#73d13d' }}> Start Job </Menu.Item> */}
        </Menu>
      </Sider>
      </Affix>
    )
  }

  /** Submission button rendered by default. If submission button's pressed,
   *  button text changes with spinning icon to indicate data has been sent
   */
  // renderSubmitButton(){
  //   if (!this.state.job_submit)
  //     return <Button type="primary" htmlType="submit"> Start Job </Button>
  //   else
  //     return <div><Button type="primary" htmlType="submit"> Submitting job... </Button>  <Spin hidden={!this.state.job_submit}/></div>
    
  // }

  /** Creates and returns the PDB2PQR configuration form. */
  renderConfigForm(){
    /** Builds checkbox options for the Additional Options header */
    const additionalOptions = [
      {name: 'DEBUMP',      value: 'atomsnotclose',    label: 'Ensure that new atoms are not rebuilt too close to existing atoms',  disabled: false},
      {name: 'OPT',         value: 'optimizeHnetwork', label: 'Optimize the hydrogen bonding network',                              disabled: false},
      {name: 'LIGANDCHECK', value: 'assignfrommol2',   label: 'Assign charges to the ligand specified in a MOL2 file',              disabled: false},
      {name: 'INPUT',       value: 'makeapbsin',       label: 'Create an APBS input file',                                          disabled: false},
      {name: 'CHAIN',       value: 'keepchainids',     label: 'Add/keep chain IDs in the PQR file',                                 disabled: false},
      {name: 'WHITESPACE',  value: 'insertwhitespace', label: 'Insert whitespaces between atom name and residue name, between x and y, and between y and z', disabled: false},
      {name: 'TYPEMAP',     value: 'maketypemap',      label: 'Create Typemap output',                                              disabled: false},
      {name: 'NEUTRALN',    value: 'neutralnterminus', label: 'Make the protein\'s N-terminus neutral (requires PARSE forcefield)', disabled: this.state.no_NC_terminus, },
      {name: 'NEUTRALC',    value: 'neutralcterminus', label: 'Make the protein\'s C-terminus neutral (requires PARSE forcefield)', disabled: this.state.no_NC_terminus, },
      {name: 'DROPWATER',   value: 'removewater',      label: 'Remove the waters from the output file',                             disabled: false},
    ]     
    let optionChecklist = [];
    additionalOptions.forEach(function(element){
      if (element['name'] == 'LIGANDCHECK'){
        optionChecklist.push(
          <div>
            <Row>
              <Checkbox name={element['name']} value={element['value']} onChange={ (e) => this.handleFormChange(e, element['name'])}> {element['label']} </Checkbox>
              {this.renderMol2UploadButton()}
            </Row>
          </div>
        );
      }

      else{
        optionChecklist.push(
          <div>
            <Row><Checkbox name={element['name']} value={element['value']} disabled={element['disabled']}> {element['label']} </Checkbox></Row>
          </div>
        );
      }
    }.bind(this));

    /** Styling to have radio buttons appear vertical */
    const radioVertStyle = {
      display:    'block',
      height:     '25px',
      lineHeight: '30px',
    }

    const dummyRequest = ({ file, onSuccess }) => {
      setTimeout(() => {
        onSuccess("ok");
      }, 0);
    };

    if (this.state.successful_submit){
      return <Redirect to={`/jobstatus?jobtype=pdb2pqr&jobid=${this.state.jobid}`}/>
    }
    else{
      return(
        <Col offset={1}>
          <Form layout="vertical" onFinish={ this.newHandleJobSubmit } >
          {/* <Form onSubmit={ (e) => this.handleJobSubmit(e, this) }> */}
            {/** Form item for PDB Source (id | upload) */}
            <Form.Item
              // id="pdbid"
              label="PDB Source"
              required={true}
            >
              <Radio.Group name="PDBSOURCE" defaultValue={this.state.form_values.PDBSOURCE} buttonStyle='solid' onChange={this.handleFormChange}>
                <Radio.Button  value="ID"> PDB ID
                {/* <Radio.Button  value="ID"> PDB ID:&nbsp;&nbsp; */}
                  {/* <Input name="PDBID" autoFocus="True" placeholder="PDB ID" maxLength={4}/> */}
                </Radio.Button>
                <Radio.Button  value="UPLOAD"> Upload a PDB file
                {/* <Radio.Button  value="UPLOAD"> Upload a PDB file:&nbsp;&nbsp; */}
                  {/* {this.renderPdbSourceInput()} */}
                  {/* <input type="file" name="PDB" accept=".pdb" hidden={this.state.pdb_upload_hidden}/> */}
                  {/* <Row><Upload name="PDB" accept=".pdb" customRequest={dummyRequest} >
                    <Button>
                      <Icon type="upload" >
                      </Icon> Click to upload
                    </Button>
                  </Upload></Row> */}
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
            
            {this.renderPdbSourceInput()}

            {/* <Form.Item> */}
              {/* {this.renderPdbSourceInput()} */}
            {/* </Form.Item> */}
            {this.renderRegistrationButton()}
            
            {/** Form item for pKa option*/}
            <Form.Item
              // id="pka"
              label="pKa Options"
            >
              {/* <Switch checkedChildren="pKa Calculation" unCheckedChildren="pKa Calculation" defaultChecked={true} /><br/> */}
              pH: <InputNumber name="PH" min={0} max={14} step={0.5} value={this.state.form_values.PH} onChange={(e) => this.handleFormChange(e, 'PH')} /><br/>
              <Radio.Group name="PKACALCMETHOD" defaultValue={this.state.form_values.PKACALCMETHOD} onChange={this.handleFormChange} >
                <Radio style={radioVertStyle} id="pka_none" value="none">    No pKa calculation </Radio>
                <Radio style={radioVertStyle} id="pka_propka" value="propka">  Use PROPKA to assign protonation states at provided pH </Radio>
                <Tooltip placement="right" title="requires PARSE forcefield">
                  <Radio style={radioVertStyle} id="pka_pdb2pka" value="pdb2pka"> Use PDB2PKA to parametrize ligands and assign pKa values <b>(requires PARSE forcefield)</b> at provided pH </Radio>
                </Tooltip>
              </Radio.Group>
            </Form.Item>
  
            {/** Form item for forcefield choice */}
            <Form.Item
              id="forcefield"
              label="Please choose a forcefield to use"
            >
              <Radio.Group name="FF" value={this.state.form_values.FF} buttonStyle="solid" onChange={this.handleFormChange}>
                <Radio.Button disabled={this.state.only_parse} value="amber">  AMBER   </Radio.Button>
                <Radio.Button disabled={this.state.only_parse} value="charmm"> CHARMM  </Radio.Button>
                <Radio.Button disabled={this.state.only_parse} value="peoepb"> PEOEPB  </Radio.Button>
                <Radio.Button value="parse">  PARSE   </Radio.Button>
                <Radio.Button disabled={this.state.only_parse} value="swanson">SWANSON </Radio.Button>
                <Radio.Button disabled={this.state.only_parse} value="tyl06">  TYL06   </Radio.Button>
                <Radio.Button disabled={this.state.only_parse} value="user">   User-defined Forcefield </Radio.Button>
              </Radio.Group><br/>
              {this.renderUserForcefieldUploadButton()}
              {/* Forcefield file: <input type="file" name="USERFF" />
              Names file (*.names): <input type="file" name="USERNAMES" accept=".names" /> */}
            </Form.Item>
  
            {/** Form item for output scheme choice*/}
            <Form.Item
              id="outputscheme"
              label="Please choose an output naming scheme to use"
            >
              <Radio.Group name="FFOUT" defaultValue={this.state.form_values.FFOUT} buttonStyle="solid" onChange={this.handleFormChange}>
                <Radio.Button value="internal"> Internal naming scheme </Radio.Button>
                {/* <Radio.Button value="internal"> Internal naming scheme <Tooltip placement="bottomLeft" title="This is placeholder help text to tell the user what this option means"><Icon type="question-circle" /></Tooltip> </Radio.Button> */}
                <Radio.Button value="amber">  AMBER   </Radio.Button>
                <Radio.Button value="charmm"> CHARMM  </Radio.Button>
                <Radio.Button value="parse">  PARSE   </Radio.Button>
                <Radio.Button value="peoepb"> PEOEPB  </Radio.Button>
                <Radio.Button value="swanson">SWANSON </Radio.Button>
                <Radio.Button value="tyl06">  TYL06   </Radio.Button>
              </Radio.Group>
            </Form.Item>
            
            {/** Form item for choosing additional options (defined earlier) */}
            <Form.Item
              id="addedoptions"
              label="Additional Options"
            >
              <Checkbox.Group name="OPTIONS" value={this.state.form_values.OPTIONS} onChange={(e) => this.handleFormChange(e, "OPTIONS")}>
                {optionChecklist}
              </Checkbox.Group>
            </Form.Item>
            
            {/** Where the submission button lies */}
            <Form.Item>
              <Col offset={18}>
                <Affix offsetBottom={100}>
                  <Row>
                    <Col>
                      {this.renderSubmitButton()}
                    {/* </Col>
                    <Col> */}
                      {/* {this.renderRegistrationButton()} */}
                    </Col>
                  </Row>
                </Affix>
              </Col>
            </Form.Item>
  
          </Form>
        </Col>
      )
    }

  }
   

  
  handleSampleForm = values => {
    console.log('Success:', values)
  }
  handleFailedSampleForm = values => {
    console.log('Failed:', values)
  }

  render(){
    return(
      <Layout id="pdb2pqr" style={{ padding: '16px 0', marginBottom: 5, background: '#fff', boxShadow: "2px 4px 3px #00000033" }}>
          {/* {this.renderSidebar()} */}
          <Layout>
            <Content style={{ background: '#fff', padding: 16, margin: 0, minHeight: 280 }}>
              {this.renderConfigForm()}
            </Content>
          </Layout>
        </Layout>    
    );
  }
}

export default ConfigPDB2PQR;