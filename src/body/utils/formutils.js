import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Layout,
  Button,
  Collapse,
} from 'antd';
import { Redirect } from 'react-router-dom';
import { FormOutlined } from '@ant-design/icons';
import '../../styles/utils.css'
import '../../styles/configJob.css';

class ConfigForm extends Component{
  constructor(props){
    super(props);
    this.state = {

      job_submit: false,
      job_date: null,
      show_register_button: false,
    }

    /** Styling to have radio buttons appear vertical */
    this.radioVertStyle = {
      display:    'block',
      height:     '25px',
      lineHeight: '30px',
    }

    this.submitButtonStyle = {
      backgroundColor: '#52c41a',
      borderColor: '#52c41a',
    }

  }

  /** If user tries submitting job again, raise alert. */
  handleJobSubmit = (e) => {
    // e.preventDefault();
    if(this.state.job_submit)
      alert("Job is submitted. Redirecting to job status page");
    else{
      this.setState({
        job_submit: true
      })
    }
  }

  hasAnalyticsId(){
    return (window._env_.GA_TRACKING_ID !== "")
  }
  
  getNewJobID(){
    console.log('inside getNewJobID')
    let id_gen_url = window._env_.ID_URL
    fetch(id_gen_url)
    .then(response => response.json())
    .then(data => {
      this.setState({
          jobid : data['job_id']
      })
      console.log(this.state.jobid)
    })
    .catch(error => console.error(error)) 
  }

  saveIdToStorage(jobid){
    
  }

  toggleRegisterButton(show_button){
    this.setState({
      show_register_button: show_button
    });
  }

  sendRegisterClickEvent(pageType){
    if( this.hasAnalyticsId() ){
      ReactGA.event({
        category: 'Registration',
        action: 'linkClick',
        label: pageType,
      })
    }
  }

  renderRegistrationButton(){
    return (
      <a href={window._env_.REGISTRATION_URL} target="_blank" rel="noopener noreferrer">
        <Button
          className='registration-button' 
          type="default"  
          size='large' 
          shape='round'
          icon={<FormOutlined />}
        >
          Register Here
        </Button>
      </a>
    )
  }

  uploadFileToS3(file_url, file_data){
    return fetch(file_url, {
      method: 'PUT',
      body: file_data,
      headers: {
        'Content-Type': '', // Removed in order to successfully PUT to S3
      }
    })
  }

  uploadJobFiles(job_file_name, token_request_payload, upload_file_data){
    let self = this

    // Attempt to upload all input files
    fetch(window._env_.API_TOKEN_URL,{
      method: 'POST',
      body: JSON.stringify(token_request_payload)
    })
    .then( response => response.json() )
    .then( data => {
      let jobid = data['job_id']
      let url_table = data['urls']
      let job_date = data['date']

      // Create payload for job config file (*job.json)
      // For every URL
      //    - fetch file to S3
      let fetch_list = []
      for( let file_name of Object.keys(url_table) ){
        let presigned_url = url_table[file_name]

        if( file_name !== job_file_name ){
          // Add fetch to promise list
          let body = new FormData()
          body.append('file', upload_file_data[file_name])
          fetch_list.push(
            self.uploadFileToS3(presigned_url, upload_file_data[file_name])
          )
        }
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

          // Upload job config file
          let job_config_file_url = url_table[ job_file_name ]
          self.uploadFileToS3( job_config_file_url, upload_file_data[job_file_name] )
          .then( job_upload_response => {
            if( job_upload_response.status < 200 || job_upload_response.status >= 300 ){
              successful_submit = false
            }
          })

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
            job_date: job_date,
          })
        })

    })
  }

  redirectToStatusPage(job_type){
    let date_query_param = ''
    if(this.state.job_date !== undefined && this.state.job_date !== null ){
      date_query_param = `&date=${this.state.job_date}`
    }
    return <Redirect to={`/jobstatus?jobtype=${job_type}&jobid=${this.state.jobid}${date_query_param}`}/>
  }

  usingJobDate(){
    if( this.props.jobdate !== null && this.props.jobdate !== undefined )
      return true
    else
      return false
  }

  /** Submission button rendered by default. If submission button's pressed,
   *  button text changes with spinning icon to indicate data has been sent
   */
  renderSubmitButton(){
    let submission_text = '';
    let loading = false;

    if(!this.state.job_submit)
      submission_text = 'Start Job'
    else{
      submission_text = 'Submitting job...'
      loading = true
    }

    // TODO: return a submission bar affixed to the bottom of the window
    return (
      <Button className='config-submit' type="primary" htmlType="submit" size='large' shape='round' loading={loading}>
        {submission_text}
      </Button>
    )

  }

}

export default ConfigForm