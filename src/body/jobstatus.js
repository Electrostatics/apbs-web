// NPM imports
import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css'

import {
  CheckCircleOutlined,
  CheckCircleFilled,
  CheckCircleTwoTone,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  LinkOutlined,
  LoadingOutlined,
  RightOutlined,
  StarTwoTone,
  FormOutlined,
} from '@ant-design/icons';

import '@ant-design/compatible/assets/index.css';

import {
  Alert,
  BackTop,
  Button,
  Checkbox,
  Col,
  Collapse,
  Layout,
  List,
  notification,
  Timeline,
  Tooltip,
  Row,
  Spin,
  Steps,
  Typography,
  Empty
} from 'antd';
import { Link as RouterLink } from 'react-router-dom';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { AutoSizer, List as VirtualList } from 'react-virtualized';
import { createElement } from 'react-syntax-highlighter';

// Project imports
import '../styles/jobstatus.css'
import '../styles/utils.css'
import { hasAnalyticsId, hasMeasurementId, sendPageView, sendRegisterClickEvent } from './utils/ga-utils'
import { JOBTYPES } from './utils/constants.ts';
import WorkflowHeader from '../common/WorkflowHeader.tsx';
import { WORKFLOW_TYPES } from '../common/WorkflowHeader.tsx';

const { Content } = Layout;
const { Title, Paragraph, Text, Link } = Typography
const { Step } = Steps

const { Panel } = Collapse;

// message.config({
//   maxCount: 2,
//   // duration: .5
// })

class JobStatus extends Component{
  constructor(props){
    super(props);
    if( hasAnalyticsId() ) {
      ReactGA.set({dimension1: props.jobid})
      ReactGA.ga('_setCustomVar',1,'jobid',props.jobid,3)
      ReactGA.pageview(window.location.pathname + window.location.search)
    }

    this.jobServerDomain = window._env_.API_URL
    this.jobStatusDomain = window._env_.STATUS_URL

    this.fetchIntervalPDB2PQR = null;
    this.fetchIntervalAPBS = null;
    this.elapsedIntervalPDB2PQR = null;
    this.elapsedIntervalAPBS = null;
    this.fetchIntervalErrorLimit = 10
    this.fetchIntervalErrorCount = {
      apbs: 0,
      pdb2pqr: 0,
    }

    this.colorCompleteStatus  = "#52C41A";
    this.colorRunningStatus   = "#1890FF";
    this.colorErrorStatus     = "#F5222D";
    this.terminalStatuses = ["complete", "failed", "error", null]
    this.possibleJobStates = {
      submitted:   'Submitted',
      pending:     'Pending Job Start',
      downloading: 'Downloading',
      uploading:   'Uploading',
      running:     'Running',
      complete:    'Complete',
      failed:      'Failed',
    }

    // this.totalElapsedTime = 0;
    this.state = {
      current_jobid: props.jobid,
      is_apbs_post_pdb2pqr: null,

      showRetry: false,
      totalElapsedTime: 0,
      elapsedTime: {
        apbs: <Spin/>,
        pdb2pqr: <Spin/>,
      },
      stop_computing_time:{
        apbs: false,
        pdb2pqr: false,
      },
      // full_request: getStatusJSON(this.props.jobid),
      // job_status_response: null
      // job_status_response: "hello world",
      pdb2pqrColor: null,
      apbsColor: null,
      pdb2pqr: {
        status: 'no_job',
        // status: null,
        startTime: null, // in seconds
        endTime: null, // in seconds
        subtasks: [],
        files: [],
        files_input: [],
        files_output: [],
      },
      apbs: {
        status: 'no_job',
        // status: null,
        startTime: null, // in seconds
        endTime: null, // in seconds
        subtasks: [],
        files: [],
        files_input: [],
        files_output: [],
      },
      
      // File sizes for input/output data
      show_download_button: false,
      file_sizes_retrieved: false,
      filesizes:{
        apbs: {},
        pdb2pqr: {},
      },

      // Contents of log/stdout/stderr data
      show_log_line_numbers: false,
      logData: {
        log: null,
        stdout: null,
        stderr: null,
      }
    }
  }

  isUsingJobtype(job_type){
    return this.props.jobtype.toLowerCase() === job_type
  }

  /** Begins fetching status as soon this component loads
   *  TODO: remove socketIO from npm package dependencies
   */
  componentDidMount(){
    // if( this.props.jobtype.toLowerCase() === 'pdb2pqr' ){
    if( this.isUsingJobtype('pdb2pqr') ){
      this.fetchIntervalPDB2PQR = this.fetchJobStatus('pdb2pqr');
    }
    else if( this.isUsingJobtype('apbs') ){
      this.fetchIntervalAPBS = this.fetchJobStatus('apbs');
      this.isPostPDB2PQR()
    }

    // TODO: add ON_CLOUD environement variable then change conditional
    // if( window._env_.ON_CLOUD == true ){}
    if( this.props.jobid !== "" && this.props.jobid !== undefined ){
      console.log(`inside componentDidMount, JOB_ID: ${this.props.jobid}`)
      const acknowledgement_btn = 
        <Button size='small' type='primary' onClick={() => notification.close('data_retention_notice')}>
          Got it!
        </Button>
      console.log(acknowledgement_btn.key)
      notification.warn({
        key: 'data_retention_notice',
        message: "Data Retention",
        duration: 0,
        // btn: acknowledgement_btn,
        description: 
          `Files for the job ${this.props.combinedJobIdDate} will be retained for 14 DAYS following job creation.\
            Please download the files you wish to keep in the meantime.`,
        // btn: (<Button type="primary" size="small" onClick={() => notification.close('data_retention_notice')}> Close </Button>)
      })
    }
  }

  /** Cleans up setInterval objects before unmounting */
  componentWillUnmount(){
    clearInterval(this.fetchIntervalPDB2PQR);
    clearInterval(this.fetchIntervalAPBS);
    clearInterval(this.elapsedIntervalPDB2PQR)
    clearInterval(this.elapsedIntervalAPBS)
  }

  /** Stops polling the job status if fetched status isn't 'running' */
  componentDidUpdate(){
    let statuses = ["complete", "failed", "error", null];
    if( statuses.includes(this.state.pdb2pqr.status) ){//} && statuses.includes(this.state.pdb2pqr.status)){
      clearInterval(this.fetchIntervalPDB2PQR);
    }
    if( statuses.includes(this.state.apbs.status) ){
      clearInterval(this.fetchIntervalAPBS);
    }

    if( this.props.jobid !== this.state.current_jobid ){
      this.setState({
        current_jobid: this.props.jobid
      })
      // this.fetchIntervalPDB2PQR = this.fetchJobStatus('pdb2pqr');
      // this.fetchIntervalAPBS = this.fetchJobStatus('apbs');     
    }
  }

  constructFileURL(filename){
    return `${window._env_.OUTPUT_BUCKET_HOST}/${this.props.jobdate}/${this.props.jobid}/${filename}`
  }

  isPostPDB2PQR(){
    const jobid = this.props.jobid
    const jobtype = JOBTYPES.PDB2PQR
    const jobdate = this.props.jobdate
    const object_name = `${jobdate}/${jobid}/${jobtype}-status.json`
    return this.fetchObjectHead(window._env_.OUTPUT_BUCKET_HOST, object_name)
    .then(response => {
      if(response.ok){
        console.log("found pdb2pqr-status.json. Job is post-PDB2PQR")
        this.setState({is_apbs_post_pdb2pqr: true})
      }else{
        console.log("couldn't find pdb2pqr-status.json. Job is not post-PDB2PQR")
        this.setState({is_apbs_post_pdb2pqr: false})
      }
    })
    .catch(error => {
      console.error(error)
    })
  }

  /**
   * Continually fetch job status from server, using 
   * response data to update states.
   * 
   * Returns the setInterval object of the aforementioned
   */
  fetchJobStatus(jobtype){
    let self = this;
    let statusStates = ["complete", "error", null];

    // Initialize interval to continually compute elapsed time
    if(this.isUsingJobtype('pdb2pqr'))
      self.elapsedIntervalPDB2PQR = self.computeElapsedTime('pdb2pqr');
    if(this.isUsingJobtype('apbs'))
      self.elapsedIntervalAPBS = self.computeElapsedTime('apbs')
    
    let status_filename = `${jobtype}-status.json`
    let status_date_prefix = ''
    if( self.usingJobDate() ){
      status_date_prefix = `${self.props.jobdate}/`
    }

    let status_url = `${window._env_.OUTPUT_BUCKET_HOST}/${status_date_prefix}${self.props.jobid}/${status_filename}`
    let interval = setInterval(function(){
      fetch(status_url)
        .then(response => {
          if( !response.ok ){
            let err = Error(`HTTP code while fetching '${status_filename}': ${response.status}`)
            err.response = response
            err.status = response.status
            throw err
          }

          // Parse response into JSON
          return response.json()
        })
        .then(data => {
            // Convert any urls in inputFiles to {jobid}/{filename}
            let inputFiles = []
            for( let path of data[jobtype].inputFiles ){
              if( path.startsWith('https://') ){
                let path_basename = path.split('/').slice(-1)[0]
                let converted_path = `${status_date_prefix}${data.jobid}/${path_basename}`
                inputFiles.push( converted_path )
              }else{
                inputFiles.push( path )
              }
            }

            // If in terminal state (e.g. "complete", "error"), set flag to check sizes
            let show_download_button = self.state.show_download_button
            if( statusStates.includes(data[jobtype].status) 
                && !self.state.file_sizes_retrieved
                && jobtype === self.props.jobtype
            ){
              // let all_filenames = data[jobtype].inputFiles.concat(data[jobtype].outputFiles)
              show_download_button = true
              let all_filenames = inputFiles.concat(data[jobtype].outputFiles)
              self.getAllFileSizes(window._env_.OUTPUT_BUCKET_HOST, all_filenames, self.props.jobid, self.props.jobdate, jobtype)
              self.getLogFiles(window._env_.OUTPUT_BUCKET_HOST, data[jobtype].outputFiles, self.props.jobid, jobtype)
            }

            // Update job-respective component states
            self.setState({
              show_download_button: show_download_button,
              [jobtype]: {
                status: data[jobtype].status,
                startTime: data[jobtype].startTime,
                endTime: data[jobtype].endTime,
                subtasks: data[jobtype].subtasks,
                files: data[jobtype].files,
                files_input: inputFiles,
                files_output: data[jobtype].outputFiles,
              },
            });
        })
        .catch(error => {
          // Continue checking for status until max retry is reached
          // TODO: 2021/03/02, Elvis - Try using the backoff method
          if( self.fetchIntervalErrorCount[jobtype] > self.fetchIntervalErrorLimit ){
            clearInterval( interval )

            // Tell elasped time interval to stop by assigned stop flag to True
            self.endStopwatch(jobtype)
            self.setElapsedTime(jobtype, 'N/A')
            self.showRetryAlert(true)
          } else { 
            self.fetchIntervalErrorCount[jobtype]++ 
          }
          console.error(error)
        });
    
    }, 1000);
    return interval;
  }

  prependZeroIfSingleDigit(numString){ 
    return (numString > 9) ? numString : '0'+ numString;
  }

  endStopwatch(jobtype){
    // Tell elasped time interval to stop by assigned stop flag to True
    let timer_flags = {}
    Object.assign(timer_flags, this.state.stop_computing_time)
    timer_flags[jobtype] = true
    this.setState({ stop_computing_time: timer_flags })
  }

  showRetryAlert(show_retry){
    this.setState({showRetry: show_retry})
  }

  resetSpinner(){
    this.setState({
      elapsedTime: {
        apbs: <Spin/>,
        pdb2pqr: <Spin/>
      }
    })
  }

  retryDownload(jobtype){

    // Deactivate error alert flag
    this.fetchIntervalErrorCount[jobtype] = 0
    this.setState({
      showRetry: false
    })

    // Attempt download again
    this.fetchJobStatus(jobtype)
  }

  usingJobDate(){
    if( this.props.jobdate !== null )
      return true
    else
      return false
  }

  getAllFileSizes(bucket_url, objectname_list, job_id, job_date, job_type){
    let promise_list = []
    for( let object_name of objectname_list ){
      if( object_name.startsWith("https://") ){
        object_name = `${job_date}/${job_id}/${object_name.split("/").slice(-1)}`
      }
      promise_list.push( this.fetchObjectHead(bucket_url, object_name) )
    }

    Promise.all( promise_list )
    .then((all_responses) =>{
      let filesize_dict = {}

      for( let i = 0; i < objectname_list.length; i++ ){
        let object_name = objectname_list[i]
        let response = all_responses[i]
        
        if(response.ok){
          let num_bytes = response.headers.get('Content-Length')
          filesize_dict[object_name] = parseInt(num_bytes)
        }
      }

      let jobfile_sizes = this.state.filesizes
      jobfile_sizes[job_type] = filesize_dict
      this.setState({
        file_sizes_retrieved: true,
        filesizes: jobfile_sizes
      })

    })
  }

  fetchObjectHead(bucket_url, object_name){
    let object_url = `${bucket_url}/${object_name}`
    return fetch(object_url, {
      method: 'HEAD',
    })
  }

  getLogFiles(bucket_url, objectname_list, job_id, job_type){
    console.log("fetching all log files")
    let promise_list = []
    const url_list = []
    const log_file_names = {
      [`${job_id}.log`]: 'log',
      [`${job_type}.stdout.txt`]: 'stdout',
      [`${job_type}.stderr.txt`]: 'stderr',
    }

    const log_promises = {
      [`${job_id}.log`]: null,
      [`${job_type}.stdout.txt`]: null,
      [`${job_type}.stderr.txt`]: null,
    }


    for( let object_name of objectname_list ){
      const file_name = object_name.split("/").slice(-1)
      
      if( file_name in log_file_names ){
        const url = `${bucket_url}/${object_name}`
        // log_promises[url] = fetch(url)
        fetch(url)
        .then(response => response.text())
        .then(data => {
          let log_data_dict = this.state.logData
          const which_log = log_file_names[file_name]
          log_data_dict[which_log] = data
        })
        .catch(err => {
          console.error(err)
          // TODO: 2021/08/21 (Elvis) Add state to allow user to reload fetch if file not found
        })

        // url_list.push(`${bucket_url}/${object_name}`)

        // promise_list.push(
        //   fetch(`${bucket_url}/${object_name}`)
        //   .then(resp => {
        //     if(resp.ok) return [file_name, resp.text().then(data => {return data})]
        //   })
        // )
      }
    }


    // Promise.all(url_list.map(url => fetch(url))).then( responses =>
    //   Promise.all(responses.map(resp => resp.text()))
    // ).then(texts => {

    // })

    // Promise.all( promise_list )
    // .then((all_data) =>{
    //   // console.log(all_data)
    //   // add to log_view dict: {"log": "", "stdout": "", "stderr": ""}

    //   let log_data_dict = this.state.logData
    //   for( let i = 0; i < all_data.length; i++ ){
    //     // const file_name = promise_list[i].split("/").slice(-1)
    //     const file_name = all_data[i][0]
    //     const log_data = all_data[i][1]
    //     console.log(file_name)
    //     console.log(log_data)
    //     if( file_name in log_file_names ){
    //       // read response body data
    //       const which_log = log_file_names[file_name]
    //       console.log(which_log)
    //       log_data_dict[which_log] = log_data
    //       console.log(log_data_dict)
    //     }
    //   }

    //   // set state with log_view dict
    //   console.log(log_data_dict)
    //   this.setState({
    //     logData: log_data_dict
    //   })
    // })
    
  }



  setElapsedTime(jobtype, value_str){
    // Get and copy current time values
    let current_elapsed_times = {}
    Object.assign(current_elapsed_times, this.state.elapsedTime)
    
    // Assign and set new time value
    current_elapsed_times[jobtype] = value_str
    this.setState({
      elapsedTime: current_elapsed_times
    })
  }

  /** Compute the elapsed time of a submitted job,
   *  for as long as it is 'running'.
   * 
   *  Returns the setInterval object of the the aforementioned
   */
  computeElapsedTime(jobtype){
    let self = this;
    let start = null;
    let accept_jobtypes = ['apbs', 'pdb2pqr']
    let interval = setInterval(function(){
      if(self.state[jobtype].status !== 'no_job'){

        let end = new Date().getTime() / 1000;
        
        console.log("\njobtype: "+jobtype)
        if( accept_jobtypes.includes(jobtype) ){
          start = self.state[jobtype].startTime
          if(self.state[jobtype].endTime){
            end = self.state[jobtype].endTime
          }
          console.log("status: "+self.state[jobtype].status)
        }
        console.log("start: "+start)
        console.log("end: "+end)
  
        let elapsedDate = null;
        let elapsedHours = null;
        let elapsedMin = null;
        let elapsedSec = null;
        if(start !== null){
          let elapsed = (end - start)*1000;
          console.log("elapsed: "+elapsed)
          
          elapsedDate = new Date(elapsed);
          console.log("elapsedDate: "+elapsedDate)
          
          // TODO: 2021/07/27 (Elvis), computed hours fails if actual runtime is greater than 24 hours because computed value is relative to start of day
          elapsedHours = self.prependZeroIfSingleDigit( elapsedDate.getUTCHours().toString() );
          elapsedMin = self.prependZeroIfSingleDigit( elapsedDate.getUTCMinutes().toString() );
          elapsedSec = self.prependZeroIfSingleDigit( elapsedDate.getUTCSeconds().toString() );
        }
        else{
          elapsedHours = '00';
          elapsedMin = '00';
          elapsedSec = '00';
        }
  
        // Applies the computed elapsed time value to the appropriate jobtype
        let time_str = 'N/A'
        if( accept_jobtypes.includes(jobtype) ){
          time_str = `${elapsedHours}:${elapsedMin}:${elapsedSec}`
        }
        self.setElapsedTime(jobtype, time_str)

        // Stop interval if a terminal status is seen
        if(self.terminalStatuses.includes(self.state[jobtype].status)){
          clearInterval(interval);
        }
  
        // Stop interval if flag is raised (job not found after X attempts)
        if( self.state.stop_computing_time[jobtype] ){
          clearInterval( interval )
        } 
      }
    }, 1000);

    return interval;
  }

  // Converts byte integer to size-appropriate string
  //    from user l2aelba via StackOverflow (https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript)
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  createFileListItem(item){
    let item_split = item.split('/')
    let file_name = item_split[ item_split.length-1 ]

    let action_list = [
      this.formatBytes(this.state.filesizes[this.props.jobtype][item]),
      <a href={window._env_.OUTPUT_BUCKET_HOST+'/'+item}><DownloadOutlined /> Download </a>
    ]


    // // Add view option if extension is .txt, .json, or .mc
    // if( item.endsWith('.txt') || item.endsWith('.json') || item.endsWith('.mc')){
    //   action_list.unshift(
    //     <a href={window._env_.OUTPUT_BUCKET_HOST+'/'+item+'?view=true'} target='_BLANK' rel="noopener noreferrer"><EyeOutlined /> View </a>
    //   )
    // }

    return (
      <List.Item actions={action_list}>
        {file_name}
      </List.Item>
    )
  }

  // TODO: 2021/02/28, Elvis - Handle status subtasks in Fargate container;
  //                             adapt function below to accommodate non-Kubernetes environment
  getReasonForFailure(jobtype){
    let reason = null
    let task_name = null
    if( this.state[jobtype].subtasks !== undefined){
      for( let task of this.state[jobtype].subtasks ){ 

        if( task.name === 'apbs-rest-downloader'){
          if( task.state === 'terminated' ){
            task_name = 'Loading Job Data'
            reason = task.state_info.reason
          }
        }
        else if( task.name === 'apbs-executor'){
          if( task.state === 'terminated' ){
            task_name = `${jobtype.toUpperCase()} execution`
            reason = task.state_info.reason
          }
        }
        else if( task.name === 'apbs-rest-uploader'){
          if( task.state === 'terminated' ){
            task_name = 'Upload results'
            reason = task.state_info.reason
          }
        }

        if( reason !== 'Completed' ){
          if( reason === 'OOMKilled' ){
            return [task_name, 'Out of memory error']
          }
          else{
            return [task_name, reason]
          }
        }
      }
    }

    return [null, null]
  }


  // Adapted from react-syntax-highlighter-virtualized-renderer source: https://github.com/conorhastings/react-syntax-highlighter-virtualized-renderer/blob/master/src/index.jsx
  logRowRenderer({ rows, stylesheet, useInlineStyles }) {
    return ({ index, key, style }) => createElement({
      node: rows[index],
      stylesheet,
      style,
      useInlineStyles,
      key,
    });
  }

  // Adapted from react-syntax-highlighter-virtualized-renderer source: https://github.com/conorhastings/react-syntax-highlighter-virtualized-renderer/blob/master/src/index.jsx
  myVirtualizedRenderer({ overscanRowCount = 10, rowHeight = 15, height = 700 } = {}) {
    return ({ rows, stylesheet, useInlineStyles }) => (
      <div style={{ height: '100%' }}>
        <AutoSizer disableHeight>
          {({ width }) => (
            <VirtualList
              // height={700}
              height={height}
              width={width}
              rowHeight={rowHeight}
              rowRenderer={this.logRowRenderer({ rows, stylesheet, useInlineStyles })}
              rowCount={rows.length}
              overscanRowCount={overscanRowCount}
            />
          )}
        </AutoSizer>
      </div>
    )
  }

  // renderCodeBlock(log_key, language, filename){
  renderCodeBlock(text, language, filename){
    let code_block
    const code_block_style = {
      maxHeight: 700,
      // display: 'flex'
      // height: 600
      height: "100%"
    }

    if(text){
      const object_key = `${this.props.jobdate}/${this.props.jobid}/${filename}`
      const num_lines_to_preview = 1000
      const split_text = text.split('\n')
      const num_lines = split_text.length
      let preface_text = ""
      let starting_line

      if(num_lines < num_lines_to_preview){
        starting_line = 1
      }else{
        const file_size = this.state.filesizes[this.props.jobtype][object_key]
        preface_text = `Text too large (${num_lines} lines, ${this.formatBytes(file_size)}). Displaying last ${num_lines_to_preview} lines...\n\n`
        // starting_line = num_lines - num_lines_to_preview + 1
        starting_line = num_lines - num_lines_to_preview - 1  // extra -1 is to account for additional blank line after preface text
      }

      code_block = 
        <SyntaxHighlighter
          // className="syntaxhighlighter"
          customStyle={code_block_style}
          language={language}
          style={atomOneDark}
          showLineNumbers={this.state.show_log_line_numbers}
          showInlineLineNumbers={this.state.show_log_line_numbers}
          startingLineNumber={starting_line}
          lineNumberStyle={(lineNum) => {
            let style = {
              paddingLeft: '1em',
              paddingRight: '1em',
            }
            if(starting_line !== 1 && lineNum <= (starting_line+1)){
              // style.display = 'none'
              style.visibility = 'hidden'
            }

            return style
          }}

          // TODO: 2021/9/14 (Elvis) If using the virtualized renderer, work out how to scroll horizontally
          // renderer={this.myVirtualizedRenderer()}
        >
          {/* {text} */}
          {preface_text + split_text.slice(-num_lines_to_preview).join('\n')}
        </SyntaxHighlighter>
    }
    else{
      code_block = <Empty description={`${filename} is empty.`}  />
    }

    return code_block
  }

  renderLogFiles(){
    let log_blocks = {}

    // for(filetype in )
    const panel_style = {
      maxHeight: 600
    }

    const createLogDownload = (filename) => {
      const url = this.constructFileURL(filename)

      if(this.state.filesizes[this.props.jobtype][`${this.props.jobdate}/${this.props.jobid}/${filename}`] > 0){
        return(
          <Tooltip placement="top" title="Download">
            <Link href={url} onClick={e => {e.stopPropagation()}}>
              <DownloadOutlined />
            </Link>
          </Tooltip>
        )
      }

      return null
    }

    if(this.state.file_sizes_retrieved){
      let logfile_view_pdb2pqr_only = null
      const log_filename = `${this.props.jobid}.log`
      const stdout_filename = `${this.props.jobtype}.stdout.txt`
      const stderr_filename = `${this.props.jobtype}.stderr.txt`

      if(this.props.jobtype === JOBTYPES.PDB2PQR){
        logfile_view_pdb2pqr_only =
          <Panel header={`Log (${log_filename})`} extra={createLogDownload( log_filename )} >
            {this.renderCodeBlock(this.state.logData.log, 'accesslog', `${this.props.jobid}.log`)}
          </Panel>
        // logfile_view_pdb2pqr_only = this.renderCodeBlock(this.state.logData.log, 'accesslog', `${this.props.jobid}.log`)
      }

      return(
        <div style={{height: '100%'}}>
          <Collapse bordered={false}>
            {logfile_view_pdb2pqr_only}
            <Panel header={`Stdout (${stdout_filename})`} extra={createLogDownload( stdout_filename )}>
              {this.renderCodeBlock(this.state.logData.stdout, 'accesslog', `${this.props.jobid}.stdout`)}
            </Panel>
            <Panel header={`Stderr (${stderr_filename})`} extra={createLogDownload( stderr_filename )}>
              {this.renderCodeBlock(this.state.logData.stderr, 'accesslog', `${this.props.jobid}.stderr`)}
            </Panel>
          </Collapse>
        </div>
      )
    }else{
      return <Empty description="Nothing to retrieve yet."/>
    }
  }

  renderCurrentStepTimeline(){
    const timeline_list = []
    const jobtype = this.props.jobtype
    let pending_text = ''

    // New Steps variables
    let current_step = 0
    let running_icon = null
    let pending_icon = null
    let complete_icon = null

    if( this.state[jobtype].status === 'pending' ){
      timeline_list.push( <Timeline.Item>{this.possibleJobStates.submitted}</Timeline.Item> )
      pending_text = this.possibleJobStates.pending

      current_step = 1
      pending_icon = <LoadingOutlined/>
    }
    else if( this.state[jobtype].status === 'running' ){
      timeline_list.push( <Timeline.Item>{this.possibleJobStates.submitted}</Timeline.Item> )
      timeline_list.push( <Timeline.Item>{this.possibleJobStates.pending}</Timeline.Item> )
      pending_text = this.possibleJobStates.running

      current_step = 2
      running_icon = <LoadingOutlined/>
      pending_icon = null
    }
    else if( this.state[jobtype].status === 'failed' ){
      let reason_for_failure = this.getReasonForFailure(jobtype)
      let task_name = null
      let reason = null
      let timeline_message = null

      if( reason_for_failure[0] !== null && reason_for_failure[1] !== null ){
        task_name = reason_for_failure[0]
        reason = reason_for_failure[1]

        timeline_message = `${this.possibleJobStates.failed} - ${task_name}: ${reason}`
      }else{
        timeline_message = this.possibleJobStates.failed
      }

      current_step = 3
      running_icon = null

      timeline_list.push( <Timeline.Item>{this.possibleJobStates.submitted}</Timeline.Item> )
      timeline_list.push( <Timeline.Item>{this.possibleJobStates.pending}</Timeline.Item> )
      timeline_list.push( <Timeline.Item>{this.possibleJobStates.running}</Timeline.Item> )
      timeline_list.push( <Timeline.Item color="red" dot={<CloseCircleOutlined />}>{timeline_message}</Timeline.Item> )
    }
    else if( this.state[jobtype].status === 'complete' ){
      current_step = 3
      complete_icon = <CheckCircleTwoTone twoToneColor="#52c41a"/>
      running_icon = null

      timeline_list.push( <Timeline.Item>{this.possibleJobStates.submitted}</Timeline.Item> )
      timeline_list.push( <Timeline.Item>{this.possibleJobStates.pending}</Timeline.Item> )
      timeline_list.push( <Timeline.Item>{this.possibleJobStates.running}</Timeline.Item> )
      timeline_list.push( <Timeline.Item color="green" dot={<CheckCircleOutlined />}>{this.possibleJobStates.complete}</Timeline.Item> )
    }


    return (
      <div>
        <Row justify="center">
          <Col span={22}>
            <Steps
              size="small"
              current={current_step}
              // progressDot
              // style={{paddingRight: 16, paddingLeft: 16}}
            >
              <Step title={this.possibleJobStates.submitted} />
              <Step icon={pending_icon} title={this.possibleJobStates.pending} />
              <Step icon={running_icon} title={this.possibleJobStates.running} />
              <Step icon={complete_icon} title={this.possibleJobStates.complete} />
              {/* TODO: 2021/08/30 (Elvis) - use "status" property of <Step/> based on exit code (#55) */}
              {/* <Step title={this.possibleJobStates.failed} /> */}
            </Steps>
          </Col>
        </Row>
      </div>
    )
  }

  renderMissingFieldsPage(){
    return(
      <Layout>
        <Typography>
          {/* <h2>Missing jobid field</h2>
          <p>Your request URL is missing the jobid field</p>
          <p>Usage: /jobstatus?<b>jobid=JOBID</b> </p> */}

          <Title level={3}>Missing query fields</Title>
          <Paragraph>Your request URL may be missing the following fields: jobid, jobtype, jobdate</Paragraph>
          <Paragraph>
            Usage: /jobstatus?jobid=<b>JOBID</b>&amp;jobtype=<b>JOBTYPE</b>&amp;jobdate=<b>JOBDATE</b>
          </Paragraph>

          {/* <Paragraph>Usage:</Paragraph> */}
        </Typography>
      </Layout>
    )  
  }

  renderWorkflowSteps(){
    let workflow_header = null
    if(this.isUsingJobtype(JOBTYPES.PDB2PQR)){
      workflow_header = <WorkflowHeader currentStep={1} stepList={WORKFLOW_TYPES.PDB2PQR} />
    }
    else if(this.isUsingJobtype(JOBTYPES.APBS)){
      if( this.state.is_apbs_post_pdb2pqr === true ){
        workflow_header = <WorkflowHeader currentStep={3} stepList={WORKFLOW_TYPES.APBS} />
      }else if(this.state.is_apbs_post_pdb2pqr === false){
        workflow_header = <WorkflowHeader currentStep={1} stepList={WORKFLOW_TYPES.APBS_ONLY} />
      }
    }
    return workflow_header
  }

  renderBookmarkRow(){
    return(
      <div >
        <Row justify="center">
          <h2>
            <Text
              copyable={{
                icon: <LinkOutlined/>,
                text: window.location,
                tooltips: ["Copy URL", "Copied"]
              }}
            >
              To return to your results after leaving,<b> save this page</b>.
            </Text>
          </h2>
          <br/>
        </Row>
      </div>
    )
  }

  renderErrorAlert(){
    let error_alert = null
    if(this.state.showRetry){
      error_alert =
        // <Row justify="center"><Col xs={24} md={20} lg={18} xl={14}>
        <Row justify="center"><Col xs={20}>
          <Alert
            showIcon
            type="error"
            message="Could not find status information for job. This may be caused by an server-side error/delay. Otherwise your Job ID doesn't exist. Please try again later."
            closeText="Retry"
            onClose={() => this.resetSpinner(jobtype)}
            afterClose={() => this.retryDownload(jobtype)}
          />
          <br/>
        </Col></Row>
    }

    return error_alert
  }

  renderJobStatsRow(){
    const jobtype = this.props.jobtype
    const combinedJobIdDate = this.props.combinedJobIdDate
    const elapsedTime = this.state.elapsedTime[jobtype] !== undefined ? this.state.elapsedTime[jobtype] : 'computing...'

    const continueButton = this.createNextProcessButton()
    
    const contentStyle = {
      fontSize: 20,
      fontWeight: 600
    }

    return(
      <div>
        <Row align="middle" justify="space-between">
          <Col xs={11} xxl={8} offset={1}>
            <Row justify="space-between">
              {/* Job ID section */}
              <Col>
                <Text>Job ID:</Text><br/>
                <Text strong style={{fontSize: 20}}>{combinedJobIdDate}</Text>
              </Col>

              {/* Job Type section */}
              <Col>
                <Text>Job Type:</Text><br/>
                <Text strong style={{fontSize: 20}}>{jobtype.toUpperCase()}</Text>
              </Col>

              {/* Elapsed time section */}
              <Col>
                <Text>Time Elapsed:</Text><br/>
                <Text strong style={{fontSize: 20}}>{elapsedTime}</Text>
              </Col>
            </Row>
          </Col>

          {/* Button for next process (e.g. APBS, 3Dmol) */}
          <Col span={3} pull={1}>
            <Row justify="end">
              <Col>
                <Text>Next:</Text><br/>
                {continueButton}
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    )
  }

  createNextProcessButton(){
    const jobtype = this.props.jobtype
    let next_process_button = null

    /** Setup button to configure APBS post-PDB2PQR */
    // let apbs_button_block = null
    // if ( jobtype !== undefined ){
    if ( jobtype === 'pdb2pqr' ){
      let date_query_param = ''
      if( this.usingJobDate() ){
        date_query_param = `&date=${this.props.jobdate}`
      }
      let apbs_config_url = `/apbs?jobid=${this.props.jobid}${date_query_param}`
      let is_disabled = true;
      if (this.state[jobtype].status === 'complete'){
        // TODO: Use alternative means to determine if user requested APBS input file
        if ( this.state[jobtype].files_output.some( e => e.slice(-3) === '.in' ) ) // check if APBS input file exists in output_files with *.in
          is_disabled = false;
      }
      next_process_button = 
      // <Button type="primary" href={apbs_config_url}>
      <RouterLink to={apbs_config_url}>
        <Button type="primary" size='middle' disabled={is_disabled}>
            Use results with APBS
            <RightOutlined />
          </Button>
      </RouterLink>
    }
    
    // Setup button to view results in vizualizer
    // TODO: use dropdown when we add more than just 3Dmol
    // let viz_button_block = null
    else if ( jobtype === 'apbs' ){
      let pqr_prefix = null

      // find pqr name prefix
      for( let element of this.state[jobtype].files_input ){
        let file_name = element.split('/').slice(-1)[0]
        let extension_index = file_name.search(/.pqr$/)
        if( extension_index !== -1 ){
          pqr_prefix = file_name.slice(0, extension_index)
          // console.log(pqr_prefix)
          break
        }
      }
      // load visualizer button link if on the respective job status page
      // let viz_3dmol_url = `/viz/3dmol?jobid=${this.props.jobid}&pqr=${pqr_prefix}`
      let date_query_param_3dmol = ''
      if( this.usingJobDate() ){
        date_query_param_3dmol = `&date=${this.props.jobdate}`
      }
      let viz_3dmol_url = `${window._env_.VIZ_URL}?jobid=${this.props.jobid}&pqr=${pqr_prefix}${date_query_param_3dmol}`
      let is_disabled = true;
      if (this.state[jobtype].status === 'complete') is_disabled = false;
      next_process_button = 
      // <Button type="primary" href={apbs_config_url}>
      <Button type="primary" size='middle' href={viz_3dmol_url} target='_BLANK' disabled={is_disabled}>
          View in 3Dmol
          {/* View in Visualizer */}
          <RightOutlined />
      </Button>
    }

    return next_process_button
  }

  renderInputOutputFiles(){
    const jobtype = this.props.jobtype
    return(
      <Row gutter={16} justify="center">
        {/* Input files */}
        <Col span={11}>
          <List
            size="small"
            bordered
            header={<Title level={5}>{jobtype.toUpperCase()} Input Files</Title>}
            // header={<Text strong>{jobtype.toUpperCase()} Input Files:</Text>}
            // header={<h3>{jobtype.toUpperCase()} Input Files:</h3>}
            dataSource={this.state[jobtype].files_input}
            renderItem={ (item) => {
              const item_split = item.split('/')
              const file_name = item_split[ item_split.length-1 ]
              let action_list = []
              if(this.state.show_download_button){
                action_list.push(
                  this.formatBytes(this.state.filesizes[this.props.jobtype][item]),
                  <a href={window._env_.OUTPUT_BUCKET_HOST+'/'+item}><DownloadOutlined /> Download </a>, 
                )
              }
              return(
                <List.Item actions={action_list}>
                  {file_name}
                </List.Item>
              )
            }}
          />
        </Col>

        {/* Output files */}
        <Col span={11}>
          <List
            size="small"
            bordered
            header={<Title level={5}>{jobtype.toUpperCase()} Output Files</Title>}
            // header={<Text strong>{jobtype.toUpperCase()} Output Files:</Text>}
            // header={<h3>{jobtype.toUpperCase()} Output Files:</h3>}
            dataSource={this.state[jobtype].files_output}
            renderItem={ (item) => this.createFileListItem(item) }
          />
        </Col>
      </Row>
    )
  }

  renderRegistrationRow(){
    return(
      <div>
        <Row justify="center">
          <Text>
            If you haven't already, please remember to <Text strong>register your use of this software</Text>:
          </Text>
        </Row>
        <Row justify="center" style={{paddingTop: 5}}>
            <a name="registration_link" href={window._env_.REGISTRATION_URL} target="_blank" rel="noopener noreferrer">
              <Button
                className='registration-button' 
                type="primary"  
                icon={<FormOutlined />}
                onClick={() => sendRegisterClickEvent('jobStatus')}
              >
                Register Here
              </Button>
            </a>

        </Row>
      </div>

    )
  }

  renderLogView(){
    let log_view = null
    
    if(this.state.file_sizes_retrieved){
      log_view = 
        <Row justify="center">
          <Col span={24}>
            <h2>
              <Text strong>Log Preview</Text>
              <br/>
              <Checkbox
                checked={this.state.show_log_line_numbers}
                onChange={e => this.setState({show_log_line_numbers: e.target.checked})}
              >
                Show line numbers
              </Checkbox>
            </h2>
            {this.renderLogFiles()}
          </Col>
        </Row>
    }

    return (
      <div><br/>
        {log_view}
      </div>
    )
  }

  render(){
    if( !this.props.jobid || !this.props.jobtype ){
      return this.renderMissingFieldsPage()
    }

    return(
      <Layout id="pdb2pqr">
          <Content style={{ background: '#fff', padding: 16, marginBottom: 5, minHeight: 280, boxShadow: "2px 4px 3px #00000033" }}>
            <BackTop/>
            {this.renderWorkflowSteps()}
            <br/>
            {this.renderBookmarkRow()}
            <br/>
            {this.renderErrorAlert()}
            {this.renderJobStatsRow()}
            <br/>
            {this.renderCurrentStepTimeline()}
            <br/>
            {this.renderInputOutputFiles()}
            <br/>
            {this.renderRegistrationRow()}
            {this.renderLogView()}
        </Content>
      </Layout>
    );
  }
}

export default JobStatus;