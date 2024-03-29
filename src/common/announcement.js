import React, { Component } from 'react';
import 'antd/dist/antd.css';
import '../styles/myfooter.css';

import { CopyToClipboard } from 'react-copy-to-clipboard';
import { CopyOutlined, GithubOutlined, LinkOutlined, BellFilled, BellOutlined } from '@ant-design/icons';
import { Layout, Tooltip, Popover, Typography, Col, Row, Drawer, message, } from 'antd';
import { List, Affix, Button, Badge, Collapse, Empty, Divider } from 'antd';
import ReactMarkdown from 'react-markdown'

const { Link, Title, Text, Paragraph } = Typography;
const { Footer } = Layout;
const { Panel } = Collapse;

class Announcement extends Component {
  constructor(props) {
    super(props)
    this.state = {
      drawer_open: this.props.open,
      notification_data: null,
      latest_message: null,
      remaining_messages: [],
      latest_message_index: [],
    }

  }

  componentDidMount(){
    this.loadMessages()
  }  

  loadMessages(){
    fetch(window._env_.ANNOUNCEMENTS_URL,{
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    }) // default URL is '/info/announcements.json'
    .then(response => response.json())
    .then(data => {
      // Sort by ascending start_date
      let notification_list = [...data]
      notification_list.sort((a, b) => {
        if( a.start_date < b.start_date ) return -1
        if( a.start_date > b.start_date ) return 1
        return 0
      })
  
      // Reverse so most recent start_date is first
      notification_list.reverse()
  
      const latest_message_index = this.getLatestMessageIndex(notification_list)
      // console.log(latest_message_index)
  
      this.setState({
        // notification_data: this.messages
        notification_data: notification_list,
        latest_message: notification_list[latest_message_index],
        remaining_messages: this.getRemainingMessages(notification_list, latest_message_index),
      })
    })
    .catch(err => {
      console.error(err)
    })
  }

  getLatestMessageIndex(message_list){
    if(message_list){
      let latest_message_index

      // Set as latest mesage if current date is within bounds
      for( let i = 0; i < message_list.length; i++ ){
        const data = message_list[i]
        if( this.displayMessage(data.start_date, data.exp_date) ){
          // latest_message = data
          latest_message_index = i
          break
        }
      }

      // return latest_message
      return latest_message_index
    }

    // Return null if no data exists
    return null
  }

  getRemainingMessages(message_list, latest_message_index){
    let remaining_message_list = []
    if(message_list){
      // return this.state.notification_data.slice(1)
      // for( let i = 0; i < this.state.notification_data.length; i++ ){
        // if(i !== this.state.latest_message_index){
      for( let i = 0; i < message_list.length; i++ ){
        if(i !== latest_message_index){
          remaining_message_list.push(message_list[i])
        }
      }
    }
    return remaining_message_list
  }

  displayMessage(start_date_str, end_date_str){
    // check start_date and exp_date
    // if within dates, return true; else false
    // let do_we_display = true
    let do_we_display = false
    const start_date = new Date(start_date_str)
    const end_date = new Date(end_date_str)
    const current_date = new Date

    // Set end time to end-of-day
    end_date.setUTCHours(23)
    end_date.setUTCMinutes(59)
    end_date.setUTCSeconds(59)

    // if( current_date < start_date || current_date > end_date ){
    if( start_date <= current_date && current_date <= end_date ){
      do_we_display = true
    }

    // return do_we_display
    return do_we_display
  }

  toggleDrawer(is_open){
    this.setState({drawer_open: is_open})
  }

  createOldNotificationList(message_list){
    let panel_list = []

    for( let message of message_list ){
      panel_list.push(
        // <Panel header={message.title}>
          <ReactMarkdown>
            {message.body}
          </ReactMarkdown>
        // </Panel>
      )
    }

    return(
      <Collapse >
        {message_list}
      </Collapse>
    )
  }

  renderLatestMessage(){
    const latest_message = this.state.latest_message
    console.log(latest_message)
    const message_style = {
      fontSize: 20,
    }

    if(this.displayMessage(latest_message.start_date, latest_message.exp_date)){
      return(
        <Row justify="center" align="middle" >
          {/* <Row justify="center" align="middle" gutter={[0, 10]}> */}
          <Col span={14} style={{textAlign: "center"}}>
            <Typography>
              {/* <Title level={3} style={{textAlign: "center"}}> */}
              <Title level={3}>
                {latest_message.title}
              </Title>
              <Paragraph style={message_style}>
                <ReactMarkdown linkTarget="_blank">
                  {latest_message.body}
                </ReactMarkdown>
              </Paragraph>
            </Typography>
          </Col>
          <Col span={14} style={{textAlign: "center"}}>
            <Button type="primary" size="middle" onClick={() => this.props.toggleDrawer(false)}>
              Close
            </Button>
          </Col>
        </Row>
      )
    }

  }

  renderEmptyMessage(){
    return(
      <div style={{textAlign: "center"}}>
        <Typography><Title level={4}>Announcements</Title></Typography>
        <Empty
          description={
            <span>No recent notices</span>
          }
        >
          <Button type="primary" size="middle" onClick={() => this.props.toggleDrawer(false)}>
            Close
          </Button>
        </Empty>
      </div>
    )
  }

  renderRemainingMessages(){
    // const remaining_messages = this.getRemainingMessages()
    const remaining_messages = this.state.remaining_messages
    if( remaining_messages ){
      const message_style = {
        fontSize: 17,
        // paddingTop: 10,
        // textAlign: "center",
        // paddingLeft: "20%",
        // paddingRight: "20%",
        // maxWidth: "75%"
      } 

      let message_list = []
      for(let message of remaining_messages){
        if(this.displayMessage(message.start_date, message.exp_date)){
          message_list.push(
            <Row justify="center" align="middle" >
            {/* <Row justalign="middle" > */}
            {/* <Row justify="center" align="middle" gutter={[0, 10]}> */}
            <Col span={14} style={{textAlign: "center"}}>
            {/* <Col offset={5} span={14}> */}
              <Typography>
                {/* <Title level={3} style={{textAlign: "center"}}> */}
                <Title level={5}>
                  {message.title}
                </Title>
                <Paragraph style={message_style}>
                  <ReactMarkdown linkTarget="_blank">
                    {message.body}
                  </ReactMarkdown>
                </Paragraph>
              </Typography>
            </Col>
            {/* <Col span={14} style={{textAlign: "center"}}>
              <Button type="primary" size="large" onClick={() => this.props.toggleDrawer(false)}>
                Close
              </Button>
            </Col> */}
          </Row>
          )
        }
      }

      // const divider = (message_list.length) ? <Divider orientation="left">Previous Announcements</Divider> : null
      const divider = (message_list.length) ? <Divider>Previous Announcements</Divider> : null
      return (
        <div>
          {divider}
          {message_list}
        </div>
      )

    } else {
      return null
    }
  }

  renderNotificationContents(){
    return
  }

  render() {
    let announcement_contents
    if(this.state.notification_data && this.state.latest_message){
      announcement_contents =
        <div>
          {this.renderLatestMessage()}
          {this.renderRemainingMessages()}
        </div>
    }
    else{
      announcement_contents = this.renderEmptyMessage()
    }

    return(
      <div>
        <Drawer
          // title="Announcements"
          visible={this.props.open}
          onClose={() => this.props.toggleDrawer(false)}
          placement="bottom"
          height={265}
        >
          {announcement_contents}
        </Drawer>
      </div>
    );
  }
}

export default Announcement;
