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
  Typography,
  Menu,
  Button,
  // Switch,
  Input,
  Radio,
  Checkbox,
  Row,
  Col,
  InputNumber,
  Popover,
  // Tooltip,
  Upload,
  // Spin,
  message,
} from 'antd';
import { Redirect } from 'react-router-dom';
import ConfigForm from './utils/formutils';
// import '../styles/configJob.css'
const { Content, Sider } = Layout;
const { Text, Title, Paragraph } = Typography;

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

    // Dynamic command line building
    this.show_cli = true ? this.props.show_cli === 'true' : false
    this.options_mapping = this.getOptionsCliMapping()
    this.cli_options = this.getCommandLineArgsDict()
    
    this.state = {
      
      // File lists
      pdbFileList: [],
      userffFileList: [],
      namesFileList: [],
      ligandFileList: [],

      // Form visual toggle flags
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

      // CLI Tracking
      cli_command: null,

      // Submission flags
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
    // Initialize cli_command string
    this.setState({ 
      cli_command: this.getCommandLine(this.state.form_values)
    })

    // if(this.props.jobid){
    //   this.setState({ jobid: this.props.jobid })
    // }
    // else{
    //   // AWS: We get new jobid at submission time
    //   // this.getNewJobID()
    // }
  }

  getOptionsCliMapping(){
    return({
      'atomsnotclose'   : 'debump',
      'optimizeHnetwork': 'opt',
      'assignfrommol2'  : 'ligand',
      'makeapbsin'      : 'apbsinput',
      'keepchainids'    : 'chain',
      'insertwhitespace': 'whitespace',
      'maketypemap'     : 'typemap',
      'neutralnterminus': 'neutraln',
      'neutralcterminus': 'neutralc',
      'removewater'     : 'dropwater',
    })
  }

  getCommandLineArgsDict(){
    let cli_dict = {
      // PDB and PQR positional args
      pdb_path:    { name: null, type: 'string', placeholder_text: 'PDB_PATH' },
      pqr_path:    { name: null, type: 'string', placeholder_text: 'PQR_OUTPUT_PATH' },

      // pKa options
      ph_calc_method: { name: '--ph-calc-method', type: 'string', placeholder_text: 'PH_METHOD' },
      with_ph:        { name: '--with-ph',        type: 'float',  placeholder_text: 'PH' },

      // Forcefield options
      ff:         { name: '--ff',        type: 'string', placeholder_text: 'FIELD_NAME' },
      userff:     { name: '--userff',    type: 'string', placeholder_text: 'USER_FIELD_FILE' },
      usernames:  { name: '--usernames', type: 'string', placeholder_text: 'USER_NAME_FILE' },
      ffout:      { name: '--ffout',     type: 'string', placeholder_text: 'FIELD_NAME' },
      
      // Ligand option
      ligand:     { name: '--ligand', type: 'string', placeholder_text: 'LIGAND_FILE' },
      
      // Additional options
      debump:     { name: '--nodebump',   type: 'bool', placeholder_text: null },
      opt:        { name: '--noopt',      type: 'bool', placeholder_text: null },
      apbsinput:  { name: '--apbs-input', type: 'bool', placeholder_text: null },
      chain:      { name: '--chain',      type: 'bool', placeholder_text: null },
      whitespace: { name: '--whitespace', type: 'bool', placeholder_text: null },
      typemap:    { name: '--typemap',    type: 'bool', placeholder_text: null },
      neutraln:   { name: '--neutraln',   type: 'bool', placeholder_text: null },
      neutralc:   { name: '--neutralc',   type: 'bool', placeholder_text: null },
      dropwater:  { name: '--drop-water', type: 'bool', placeholder_text: null },

    }

    return cli_dict
  }

  getCommandLine(form_items){
    let command = 'python pdb2pqr.py'
    
    // Append pKa options
    if( form_items.PKACALCMETHOD !== 'none' ){
      let pka_args = `${this.cli_options.ph_calc_method.name}=${form_items.PKACALCMETHOD} ${this.cli_options.with_ph.name}=${form_items.PH}`
      command = `${command} ${pka_args}`
    }

    // Append forcefield options
    let ff_args
    if( form_items.FF === 'user' ){
      let userff_filename = form_items.USERFFFILE
      let names_filename  = form_items.NAMESFILE
      if( userff_filename === '' ) userff_filename = this.cli_options.userff.placeholder_text
      if( names_filename === '' ) names_filename = this.cli_options.usernames.placeholder_text

      ff_args = `${this.cli_options.ff.name}=${userff_filename} ${this.cli_options.usernames.name}=${names_filename}`
    }else{
      ff_args = `${this.cli_options.ff.name}=${form_items.FF}`
    }
    command = `${command} ${ff_args}`

    // Append output forcefield options
    let ffout_args = ''
    if( form_items.FFOUT !== 'internal' ){
      ffout_args = `${this.cli_options.ffout.name}=${form_items.FFOUT}`
      command = `${command} ${ffout_args}`
    }
    
    // Append ligand options
    let ligand_args
    if( form_items.LIGANDFILE !== '' && form_items.OPTIONS.includes('assignfrommol2')){
      ligand_args = `${this.cli_options.ligand.name}=${form_items.LIGANDFILE}`
      command = `${command} ${ligand_args}`
    }

    // Append other options
    let additional_args = ''
    let to_debump = true
    let to_opt = true
    for( let option of Object.keys(this.options_mapping) ){
      if( form_items.OPTIONS.includes(option) && ['atomsnotclose', 'optimizeHnetwork'].includes(option) ){
        if( option === 'atomsnotclose' ) to_debump = false
        else if( option === 'optimizeHnetwork' ) to_opt = false
      }else if( form_items.OPTIONS.includes(option) ){
        let cli_arg = this.cli_options[ this.options_mapping[option] ].name
        additional_args = `${additional_args} ${cli_arg}`
      }
    }
    if( to_debump ) command = `${command} ${this.cli_options.debump.name}`
    if( to_opt ) command = `${command} ${this.cli_options.opt.name}`
    if( additional_args.length > 0 ) command = `${command} ${additional_args}`

    // Append PDB/PQR positional arguments
    let pdb_arg = this.cli_options.pdb_path.placeholder_text
    let pqr_arg = this.cli_options.pqr_path.placeholder_text
    let pdb_name
    if( form_items.PDBSOURCE === "ID"){
      pdb_name = form_items.PDBID
    }
    else{
      pdb_name = form_items.PDBFILE.slice(0, -4)
    }
    if( pdb_name !== "" ){
      pdb_arg = `${pdb_name}.pdb`
      pqr_arg = `${pdb_name}.pqr`
    }
    command = `${command} ${pdb_arg} ${pqr_arg}`

    return command
  }

  renderCommandLine(command_string){
    return(
      <div>
        <Text code copyable>
          {command_string}
        </Text>
      </div>
    )
  }

  renderCLIPopoverContents(additional_options){
    let popover_titles
    let popover_contents = {}

    // PDB file
    // popover_contents['pdb'] = 

    // Forcefield used
    let ff_text
    if( this.state.form_values['FF'] !== 'user' ){
      ff_text = <div> {this.cli_options.ff.name}=<b>{this.state.form_values['FF']}</b> </div>
    }else{
      let userff_filename = this.state.form_values['USERFFFILE']
      let names_filename = this.state.form_values['NAMESFILE']

      if( userff_filename === '' ) userff_filename = this.cli_options.userff.placeholder_text
      if( names_filename === '' ) names_filename = this.cli_options.usernames.placeholder_text

      ff_text = <div> {this.cli_options.userff.name}=<b>{userff_filename}</b> </div>
      ff_text = <div> {this.cli_options.userff.name}=<b>{userff_filename}</b> {this.cli_options.usernames.name}=<b>{names_filename}</b> </div>
    }
    popover_contents['ff'] = 
      <div>
        <code>
          {/* {this.cli_options.ff.name}=<b>{this.state.form_values['FF']}</b> {this.cli_options.ff.name}=<b>{this.state.form_values['PH']}</b> */}
          {ff_text}
        </code>
      </div>
    
    // Forcefield output naming scheme
    let ffout_text
    if( this.state.form_values['FFOUT'] === 'internal' ){
      // ffout_text = <div> {this.cli_options.ffout.name}=<b>{this.state.form_values['FFOUT']}</b> </div>
      ffout_text = <s> {this.cli_options.ffout.name}=<b>{this.cli_options.ffout.placeholder_text}</b> </s>
    }else{
      ffout_text = <div> {this.cli_options.ffout.name}=<b>{this.state.form_values['FFOUT']}</b> </div>
    }
    popover_contents['ffout'] =
      <div>
        <code> {ffout_text} </code>
      </div>

    // pKa Options
    let pka_text
    if( this.state.form_values['PKACALCMETHOD'] === 'none' ){
      pka_text = <div> {this.cli_options.ph_calc_method.name}=<b>{this.state.form_values['PKACALCMETHOD']}</b> <s>{this.cli_options.with_ph.name}=<b>{this.state.form_values['PH']}</b></s> </div>
    }else{
      pka_text = <div> {this.cli_options.ph_calc_method.name}=<b>{this.state.form_values['PKACALCMETHOD']}</b> {this.cli_options.with_ph.name}=<b>{this.state.form_values['PH']}</b> </div>
    }
    popover_contents['pka'] = 
      <div>
        <code>
          {pka_text}
        </code>
      </div>

    // Mol2
    let ligand_filename = this.state.form_values['LIGANDFILE']
    if( ligand_filename === '' ) ligand_filename = this.cli_options.ligand.placeholder_text

    popover_contents['ligand'] =
      <div>
        <code>
          {this.cli_options.ligand.name}=<b>{ligand_filename}</b>
        </code>
      </div>
    
    // Additional boolean options
    for( let option of additional_options ){
      if( !(option.cli in popover_contents) ){
        let cli_arg
        if( this.state.form_values.OPTIONS.includes(option.value) && ['atomsnotclose', 'optimizeHnetwork'].includes(option.value) ){
          // Having these options checked means we don't use in command line
          cli_arg = <s> {this.cli_options[option.cli].name} </s> 
        }
        else{
          cli_arg = this.cli_options[option.cli].name
        }
        
        popover_contents[option.cli] =
          <div>
            <code>
              {cli_arg}
            </code>
          </div>
      }
    }

    return {
      title: 'CLI',
      contents: popover_contents
    }
  }

  /** Updates current state of form values when changed */
  handleFormChange = (e, nameString) => {
    let itemName  = (nameString === undefined) ? e.target.name : nameString;
    let itemValue = (e.target !== undefined) ? e.target.value : e;
    // let itemValue = e.target.value;
    // let itemName  = e.target.name;

    // Update form values and update CLI string
    let form_values = this.state.form_values;
    form_values[itemName] = itemValue;
    let updated_command = this.getCommandLine( form_values )
    console.log(updated_command)
    this.setState({ 
      form_values: form_values,
      cli_command: updated_command,
    })

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

      // Map additional options to expected values; add to payload
      let form_and_options = this.state.form_values;
      for(let option of form_and_options['OPTIONS']){
        form_and_options[OptionsMapping[option]] = option
      }

      let payload = {
        form : form_and_options,
        metadata: { }
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
      this.uploadJobFiles(job_file_name, token_request_payload, upload_file_data)
      
      // // Attempt to upload all input files
      // fetch(window._env_.API_TOKEN_URL,{
      //   method: 'POST',
      //   body: JSON.stringify(token_request_payload)
      // })
      // .then( response => response.json() )
      // .then( data => {
      //   let jobid = data['job_id']
      //   let url_table = data['urls']

      //   // Create payload for job config file (*job.json)
      //   // For every URL
      //   //    - fetch file to S3
      //   let fetch_list = []
      //   for( let file_name of Object.keys(url_table) ){
      //     let presigned_url = url_table[file_name]

      //     if( file_name !== job_file_name ){
      //       // Add fetch to promise list
      //       let body = new FormData()
      //       body.append('file', upload_file_data[file_name])
      //       fetch_list.push(
      //         self.uploadFileToS3(presigned_url, upload_file_data[file_name])
      //       )
      //     }
      //   }

      //   let successful_submit = true
      //   // let successful_submit = false
      //   Promise.all( fetch_list )
      //     .then(function(all_responses){
      //       // Check response codes of each upload response
      //       for( let response of all_responses ){
      //         if( response.status < 200 || response.status >= 300 ){
      //           successful_submit = false
      //           break
      //         }
      //       }

      //       // Upload job config file
      //       let job_config_file_url = url_table[ job_file_name ]
      //       self.uploadFileToS3( job_config_file_url, upload_file_data[job_file_name] )
      //       .then( job_upload_response => {
      //         if( job_upload_response.status < 200 || job_upload_response.status >= 300 ){
      //           successful_submit = false
      //         }
      //       })

      //       // Might do additional stuff here

      //     })
      //     .catch(error => {
      //       console.error('Error: ', error)
      //       successful_submit = false
      //     })
      //     .finally(() => {
      //       // Set flag to redirect to job status page
      //       self.setState({ 
      //         jobid: jobid,
      //         successful_submit: successful_submit,
      //         job_submit: false,
      //       })
      //     })

      // })
    }
  }

  // uploadConfigFile(file_url, file_data){
  //   return fetch(file_url, {
  //     method: 'PUT',
  //     body: file_data,
  //     headers: {
  //       'Content-Type': '', // Removed in order to successfully PUT to S3
  //     }
  //   })
  // }

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

  beforeUpload(file, fileList, self, file_type){
    console.log("we in beforeUpload")
    // console.log(file)
    // console.log(file.name.endsWith('.pdb'))
    let form_values = self.state.form_values;
    let cli_command = self.state.cli_command
    if( file_type === 'pdb' ){
      if(!file.name.toLowerCase().endsWith('.pdb')){
        message.error('You must upload a PDB (*.pdb) file!');
        return false;
      }
      else{
        form_values['PDBFILE'] = file.name;
        self.setState({
          pdbFileList: fileList.slice(-1),
          show_register_button: true,
        })  
      }
    }
    else if( file_type === 'userff' ){
      if(!file.name.toLowerCase().endsWith('.dat')){
        message.error('You must upload a Force Field (*.dat) file!');
        return false;
      }
      else{
        form_values['USERFFFILE'] = file.name;
        self.setState({ userffFileList: fileList.slice(-1) })
      }      
    }
    else if( file_type === 'names' ){      
      if(!file.name.toLowerCase().endsWith('.names')){
        message.error('You must upload a Names (*.names) file!');
        return false;
      }
      else{
        form_values['NAMESFILE'] = file.name;
        self.setState({ namesFileList: fileList.slice(-1) })
      }
    }
    else if( file_type === 'ligand' ){
      if(!file.name.toLowerCase().endsWith('.mol2')){
        message.error('You must upload a Ligand (*.mol2) file!');
        return false;
      }
      else{
        form_values['LIGANDFILE'] = file.name;
        self.setState({ ligandFileList: fileList.slice(-1) })
      }
    }

    cli_command = self.getCommandLine( form_values ) // update CLI command string
    self.setState({ form_values, cli_command })
    return false;
  }

  removeSelectedUploadFile(e, self, form_key, file_list_key){
    // Reset form value keys when file is unselected
    let form_values = this.state.form_values;
    form_values[form_key] = '';

    this.setState({ 
      [file_list_key]: [],
      form_values: form_values,
    })
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
            beforeUpload={ (e, fileList) => this.beforeUpload(e, fileList, this, 'pdb')}
            // onChange={ (e) => this.handleUpload(e, this, 'pdb') }
            onRemove={ (e) => this.removeSelectedUploadFile(e, this, 'PDBFILE', 'pdbFileList') }
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
          beforeUpload={ (e, fileList) => this.beforeUpload(e, fileList, this, 'userff')}
          // onChange={ (e) => this.handleUpload(e, this, 'userff') }
          onRemove={ (e) => this.removeSelectedUploadFile(e, this, 'USERFFFILE', 'userffFileList') }
        >
          <Button icon={<UploadOutlined />}> Select File </Button>
        </Upload>

      let names_upload = 
        <Upload
          name="file"
          accept=".names"
          action={upload_url}
          fileList={this.state.namesFileList}
          beforeUpload={ (e, fileList) => this.beforeUpload(e, fileList, this, 'names')}
          // onChange={ (e) => this.handleUpload(e, this, 'names') }
          onRemove={ (e) => this.removeSelectedUploadFile(e, this, 'NAMESFILE', 'namesFileList') }
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
        beforeUpload={ (e, fileList) => this.beforeUpload(e, fileList, this, 'ligand')}
        // onChange={ (e) => this.handleUpload(e, this, 'ligand') }
        onRemove={ (e) => this.removeSelectedUploadFile(e, this, 'LIGANDFILE', 'ligandFileList') }
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
    /** Labels for the Additional Options header */
    const additionalOptions = [
      {name: 'DEBUMP',      value: 'atomsnotclose',    cli: 'debump',     label: 'Ensure that new atoms are not rebuilt too close to existing atoms',  disabled: false},
      {name: 'OPT',         value: 'optimizeHnetwork', cli: 'opt',        label: 'Optimize the hydrogen bonding network',                              disabled: false},
      {name: 'LIGANDCHECK', value: 'assignfrommol2',   cli: 'ligand',     label: 'Assign charges to the ligand specified in a MOL2 file',              disabled: false},
      {name: 'INPUT',       value: 'makeapbsin',       cli: 'apbsinput',  label: 'Create an APBS input file',                                          disabled: false},
      {name: 'CHAIN',       value: 'keepchainids',     cli: 'chain',      label: 'Add/keep chain IDs in the PQR file',                                 disabled: false},
      {name: 'WHITESPACE',  value: 'insertwhitespace', cli: 'whitespace', label: 'Insert whitespaces between atom name and residue name, between x and y, and between y and z', disabled: false},
      {name: 'TYPEMAP',     value: 'maketypemap',      cli: 'typemap',    label: 'Create Typemap output',                                              disabled: false},
      {name: 'NEUTRALN',    value: 'neutralnterminus', cli: 'neutraln',   label: 'Make the protein\'s N-terminus neutral (requires PARSE forcefield)', disabled: this.state.no_NC_terminus, },
      {name: 'NEUTRALC',    value: 'neutralcterminus', cli: 'neutralc',   label: 'Make the protein\'s C-terminus neutral (requires PARSE forcefield)', disabled: this.state.no_NC_terminus, },
      {name: 'DROPWATER',   value: 'removewater',      cli: 'dropwater',  label: 'Remove the waters from the output file',                             disabled: false},
    ]     

    /** Get customized header/label options for CLI popover */
    const title_level = 5
    const cli_popovers = this.renderCLIPopoverContents(additionalOptions)
    let cli_builder = null
    if( this.show_cli === true ){
      // cli_builder = this.renderCommandLine(this.state.cli_command)
      cli_builder = 
        <div>
          <Title level={title_level}>Command (debug):</Title>
          <Paragraph>
            {this.renderCommandLine(this.state.cli_command)}
          </Paragraph>
        </div>
    }

    /** Builds checkbox options for the Additional Options header */
    let optionChecklist = [];
    additionalOptions.forEach(function(element){
      if (element['name'] == 'LIGANDCHECK'){
        optionChecklist.push(
          <div>
            <Popover placement="left" title={cli_popovers.title} content={cli_popovers.contents.ligand}>
              <Row>
                <Checkbox name={element['name']} value={element['value']} onChange={ (e) => this.handleFormChange(e, element['name'])}> {element['label']} </Checkbox>
                {this.renderMol2UploadButton()}
              </Row>
            </Popover>
          </div>
        );
      }

      else{
        optionChecklist.push(
          <div>
            <Popover placement="left" title={cli_popovers.title} content={cli_popovers.contents[element['cli']]}>
              <Row><Checkbox name={element['name']} value={element['value']} disabled={element['disabled']}> {element['label']} </Checkbox></Row>
            </Popover>
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
          
            {cli_builder}

            {/** Form item for PDB Source (id | upload) */}
            <Title level={title_level}>PDB Selection</Title>
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
            <Title level={title_level}>pKa Options</Title>
            <Popover placement="bottomLeft" title={cli_popovers.title} content={cli_popovers.contents.pka}>
              <Form.Item
                // id="pka"
                // label="pKa Options"
              >
                {/* <Switch checkedChildren="pKa Calculation" unCheckedChildren="pKa Calculation" defaultChecked={true} /><br/> */}
                pH: <InputNumber name="PH" min={0} max={14} step={0.5} value={this.state.form_values.PH} onChange={(e) => this.handleFormChange(e, 'PH')} /><br/>
                <Radio.Group name="PKACALCMETHOD" defaultValue={this.state.form_values.PKACALCMETHOD} onChange={this.handleFormChange} >
                  <Radio style={radioVertStyle} id="pka_none" value="none">    No pKa calculation </Radio>
                  <Radio style={radioVertStyle} id="pka_propka" value="propka">  Use PROPKA to assign protonation states at provided pH </Radio>
                  {/* <Tooltip placement="right" title="requires PARSE forcefield"> */}
                    <Radio style={radioVertStyle} id="pka_pdb2pka" value="pdb2pka"> Use PDB2PKA to parametrize ligands and assign pKa values <b>(requires PARSE forcefield)</b> at provided pH </Radio>
                  {/* </Tooltip> */}
                </Radio.Group>
              </Form.Item>
            </Popover>
  
            {/** Form item for forcefield choice */}
            <Title level={title_level}>Forcefield Options</Title>
            <Popover placement="bottomLeft" title={cli_popovers.title} content={cli_popovers.contents.ff}>
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
            </Popover>
  
            {/** Form item for output scheme choice*/}
            <Popover placement="bottomLeft" title={cli_popovers.title} content={cli_popovers.contents.ffout}>
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
            </Popover>
            
            <Title level={title_level}>Additional Options</Title>
            {/** Form item for choosing additional options (defined earlier) */}
            <Form.Item
              id="addedoptions"
              // label="Additional Options"
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