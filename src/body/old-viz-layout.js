import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css';
import { Layout, Col, Row } from 'antd';
import { Typography } from 'antd';
import { Switch, Slider, InputNumber } from 'antd';
import { Select } from 'antd';


// import { ExportOutlined } from '@ant-design/icons'
// import './viz/static'
// import './viz/static/3dmol/js/visualize_html'
// import './viz/static/3dmol/js/3dmol'
// import './viz/static/3dmol/js/3dmol'
import * as $3Dmol from '3dmol/build/3Dmol'
// require('3dmol/build/3Dmol')
// import * as $3Dmol from '3dmol/build/3Dmol-nojquery'

// Styles and images
import './viz/static/3dmol/css/foundation.css'
import './viz/static/3dmol/css/pure-min.css'
import './viz/static/3dmol/css/toggles.css'
import './viz/static/3dmol/css/pdb2pqr_3dmol.css'
import RWB_image from './viz/static/3dmol/images/rwb.png'
import RGB_image from './viz/static/3dmol/images/rgb.png'

const { Content } = Layout;
const { Title, Text, Link } = Typography;
const { Option } = Select;

class VizLegacyPage extends Component{
    constructor(props){
        super(props)
        if( window._env_.GA_TRACKING_ID !== "" ) 
            ReactGA.pageview(window.location.pathname + window.location.search)

        let queryParser = require('query-string-es5')
        let parsed_query = queryParser.parse(this.props.query)


        this.jobid = parsed_query['jobid']
        this.pqr_prefix = parsed_query['pqr']
        this.storage_host = window._env_.OUTPUT_BUCKET_HOST
    
        // 3dmol global objects
        this.protein = {
            surface: $3Dmol.SurfaceType.SAS,
            opacity: 1,
            min_isoval: -5,
            max_isoval: 5,
            colorScheme: "RWB",
            volumedata: null
        }


        this.glviewer = null;
        this.volumedata = null;
        this.surf = null;
        this.surfaceOn = true
        this.surfaceOpacity = true
        this.labels = [];
        this.modelLabels = false

        // Initial render flags
        this.pqr_loaded = false
        this.cube_loaded = false

        this.state = {
            jobid: this.props.query.jobid,
            pqr_prefix: this.props.query.pqr,
            storage_host: window._env_.OUTPUT_BUCKET_HOST,

            // Protein
            min_isoval: -5,
            max_isoval: 5,

            // 3dmol states
            surfid: null,
            surfaceOn:      true,
            surfaceOpacity: true,
            modelLabels:    false,

            // Model/Surface
            surface_type: 'SAS',
            model_type: 'line',

            // Scheme
            color_scheme: 'RWB',
            colorbar_image: RWB_image,
        }

        this.set_vis = this.set_vis.bind(this)
        this.reset_vals = this.reset_vals.bind(this)
        this.update_surface = this.update_surface.bind(this)
        this.update_selected_surface = this.update_selected_surface.bind(this)
        this.update_selected_scheme = this.update_selected_scheme.bind(this)

        // Toggle bindings
        // this.toggleSurface = this.toggleSurface.bind(this)
    }

    componentDidMount(){
        console.log('loading GL viewer')
        this.glviewer = this.createGlViewer()
    }

    createGlViewer(){
        let glviewer

        console.log('about to load')
        glviewer = $3Dmol.createViewer("gldiv", {
            defaultcolors : $3Dmol.rasmolElementColors
            });
        glviewer.setBackgroundColor("black");        
        console.log('loaded')
        
        return glviewer
    }

    addLabels() {
        let atoms = this.glviewer.getModel().selectedAtoms({
            atom : "CA"
        });
        for ( let a in atoms) {
            let atom = atoms[a];
    
            let l = this.glviewer.addLabel(
                atom.resn + " " + atom.resi,
                {
                    inFront : true,
                    fontSize : 12,
                    position : {
                        x : atom.x,
                        y : atom.y,
                        z : atom.z
                    }
                },
                // atoms[a],
                // true
            );
            atom.label = l;
            this.labels.push(atom);
        }
    };

    removetheLabels() {
        // for (let i = 0; i < this.labels.length; i++) {
        //     let atom = this.labels[i]
        //     this.glviewer.removeLabel(atom.label)
        //     delete atom.label
        // }
        this.glviewer.removeAllLabels()

        //console.log(labels)
        
        this.labels = []
    
    };

    addpqr(data){
        //moldata = data = $("#moldata_pdb_large").val();
        //console.log(data); //see contents of file
        let receptorModel = this.glviewer.addModel(data, "pqr");
    
        let atoms = receptorModel.selectedAtoms({});
    
        /* removed until remove atom functionality is fixed
        for ( var i in atoms) {
            var atom = atoms[i];
            atom.clickable = true;
            atom.callback = atomcallback;
        }
        */
        this.glviewer.mapAtomProperties($3Dmol.applyPartialCharges);
        this.glviewer.zoomTo();
        this.glviewer.render();
    };

    addcube(volumedata){
        //protein.volumedata = volumedata;
        this.volumedata = new $3Dmol.VolumeData(volumedata, "cube");
        // window.volumedata = new $3Dmol.VolumeData(volumedata, "cube");
        //volumedata = $("#volumetric_data").val();
        //glviewer.addIsosurface(volumedata, {isoval: -5, color:"red", smoothness: 10})
        //glviewer.addIsosurface(volumedata, {isoval: 5, color:"blue", smoothness: 1})
        
        this.glviewer.render();
        this.create_surface();
    };

    backbone(){
        let atoms = this.glviewer.getModel().selectedAtoms({
            });
        for ( let i = 0; i < atoms.length; i++) {
            let atom = atoms[i];
        // if (atom.atom == "H")
        //    delete atom
        //if (atom == "O")
        //    delete atom
        //if (atom.atom == "CA")
        atoms.splice(i,1);
        }
    }

    // readText(input, func) {
    
    //     if(input.length > 0) {
    //         let file = input[0];
    //         let reader = new FileReader();
    //         reader.onload = function(evt) {
    //             func(evt.target.result,file.name);
    //         };
    //         reader.readAsText(file); //needs to be type Blob
    //         $(input).val('');
            
    //     }
    
    // };

    distance(atom1, atom2) {
        let m = this.glviewer.getModel(0);
        let myatoms = m.selectedAtoms({});
        //console.log(myatoms)
        let myatom
        for ( let i in myatoms) {
            myatom = myatoms[i];
            myatom.clickable = true;
        }   
        myatom.onclick = console.log(myatom)
    };

    update_surface(action, color_scheme){
        let e = document.getElementById("selected_surface");

        if( e !== null){
            // let x = e.options[e.selectedIndex].value;
            let x = e.value;
            // if( this.surf !== undefined) 
            //     this.glviewer.removeSurface(this.surf.surfid);
            switch (action){
                case 1:
                    if (x == 'SAS')
                       this.protein.surface = $3Dmol.SurfaceType.SAS;
                    else if (x == 'SES')
                        this.protein.surface = $3Dmol.SurfaceType.SES;
                    else if (x == 'VDW')
                        this.protein.surface = $3Dmol.SurfaceType.VDW;
                    break;
                case 2:
                    this.protein.opacity = 0.70;
                    break;
                case 3: 
                    this.protein.opacity = 1;
                    break;
                case 4:
                    this.protein.min_isoval = -5;
                    this.protein.max_isoval = 5;
                    break;
                
                default:
                    break;
            }
            this.set_color(color_scheme);
        }
    }

    show_colorbar(value){
        let w = document.getElementById("selected_scheme");
        // let y = w.options[w.selectedIndex].value;
        let y = value
        //console.log(y);
        if(y === 'RWB'){
            // document.getElementById("colorbar").innerHTML ="<img src=/viz/static/3dmol/images/rwb.png width='250'>";
            this.setState({colorbar_image: RWB_image})
        }
        if(y === 'RGB'){
            // document.getElementById("colorbar").innerHTML ="<img src=/viz/static/3dmol/images/rgb.png width='250'>";
            this.setState({colorbar_image: RGB_image})
        }

    }

    surface_vis(e){
        //console.log(here);
        // if(e.target.checked)
        if(e === true){
            this.on_surface();
        }
        else{
            // this.glviewer.removeSurface(this.surf);
            this.glviewer.removeSurface(this.surf.surfid);
            // this.glviewer.removeSurface(this.state.surfid);
        }
    }

    surface_opacity(make_opaque){
        //console.log(here);
        // if(checkbox.checked)
        if(make_opaque){
            this.update_surface(3);
        }
        else{
            this.update_surface(2);
        }
    }

    surface_labels(show_labels){
        //console.log(here);
        // if(checkbox.checked){
        if(show_labels){
            // this.glviewer.render();
            this.addLabels(this.glviewer); 
        }
        else{
            this.removetheLabels(this.glviewer);
            // this.glviewer.render();
        }
    }

    // set_vis(e){
    //     let f = document.getElementById("selected_vis");
    //     if( f !== null){
    //         console.log(f.value)
    //         // let y = f.options[f.selectedIndex].value;
    //         let y = f.value;
    //         // vis=y;
    
    //         if(y=="stick"){ this.glviewer.setStyle({},{stick:{}}); this.glviewer.render();}
    //         if(y=="line"){ this.glviewer.setStyle({},{line:{}}); this.glviewer.render();}
    //         if(y=="cross"){ this.glviewer.setStyle({},{cross:{linewidth:5}}); this.glviewer.render();}
    //         if(y=="sphere"){ this.glviewer.setStyle({},{sphere:{}}); this.glviewer.render();}
    //         if(y=="cartoon"){ this.glviewer.setStyle({hetflag:false},{cartoon:{color: 'spectrum'}}); this.glviewer.render();}
    //     }
    // }

    set_vis(value){
        // let f = document.getElementById("selected_vis");
        // if( f !== null){
        //     console.log(f.value)
        //     // let y = f.options[f.selectedIndex].value;
        //     let y = f.value;
        //     // vis=y;
    
        //     if(y=="stick"){ this.glviewer.setStyle({},{stick:{}}); this.glviewer.render();}
        //     if(y=="line"){ this.glviewer.setStyle({},{line:{}}); this.glviewer.render();}
        //     if(y=="cross"){ this.glviewer.setStyle({},{cross:{linewidth:5}}); this.glviewer.render();}
        //     if(y=="sphere"){ this.glviewer.setStyle({},{sphere:{}}); this.glviewer.render();}
        //     if(y=="cartoon"){ this.glviewer.setStyle({hetflag:false},{cartoon:{color: 'spectrum'}}); this.glviewer.render();}
        // }

        if(value === "stick"){ 
            this.glviewer.setStyle({},{stick:{}})
            // this.glviewer.render()
        }
        else if(value === "line"){ 
            this.glviewer.setStyle({},{line:{}})
            // this.glviewer.render()
        }
        else if(value === "cross"){
            this.glviewer.setStyle({},{cross:{linewidth:5}})
            // this.glviewer.render()
        }
        else if(value === "sphere"){
            this.glviewer.setStyle({},{sphere:{}})
            // this.glviewer.render()
        }
        else if(value === "cartoon"){
            this.glviewer.setStyle({hetflag:false},{cartoon:{color: 'spectrum'}})
            // this.glviewer.render()
        }
        this.glviewer.render()

        this.setState({
            model_type: value
        })
}

    set_color(color_scheme){
        //inefficient -- need to fix!
        //want to set as protein attribute

        if( color_scheme === undefined){
            // let f = document.getElementById("selected_scheme");
            // // let y = f.options[f.selectedIndex].value;

            // // let y = f.value;
            // // this.protein.colorScheme=y;

            // color_scheme = f.value;

            color_scheme = this.state.color_scheme
        }
        this.protein.colorScheme=color_scheme;
        
        let volscheme_to_use
        if(this.protein.colorScheme === "RWB"){
            volscheme_to_use = new $3Dmol.Gradient.RWB(this.protein.min_isoval,this.protein.max_isoval);
        }
        else if(this.protein.colorScheme === "RGB"){
            volscheme_to_use = new $3Dmol.Gradient.ROYGB(this.protein.min_isoval,this.protein.max_isoval);
        }
        else if(this.protein.colorScheme === "BWR"){
            volscheme_to_use = new $3Dmol.Gradient.Sinebow(this.protein.min_isoval,this.protein.max_isoval);
        }
        
        // if(  )
        let previous_surf = this.surf
        try{
            this.glviewer.removeSurface(previous_surf.surfid)
        }catch{
            console.log(`Could not remove surface: ${previous_surf.surfid}`)
            console.log(previous_surf)
        }
        this.surf = this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use});
        // this.surf = this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use}, {}, {}, {}, (e) => this.setState({surfid: e}) );
        // let surf = this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use});
        // this.setState({surfid: surf.surfid})
        // console.log(this.surf.surfid)
        // let self = this
        // this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use})
        //     .then(surf => this.setState({surfid: surf.surfid}) )

    }

    //starts program with SAS surface
    create_surface(){
        let volscheme_to_use = new $3Dmol.Gradient.RWB(this.protein.min_isoval, this.protein.max_isoval);
        if( this.surf === null ){
            this.surf = this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use});
        }
        
        // this.surf = this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use}, {}, {}, {}, (e) => this.setState({surfid: e}) );
        // let surf = this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use});
        // this.setState({surfid: surf.surfid})
        // console.log(this.surf.surfid)

        // this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use})
        //     .then(surf => this.setState({surfid: surf.surfid}) )
    }

    //Turn on the surface for the current selected surface
    on_surface(){
        let e = document.getElementById("selected_surface");
        // let x = e.options[e.selectedIndex].value;
        let x = this.state.surface_type;
        if (x == 'SAS')
            this.protein.surface = $3Dmol.SurfaceType.SAS;
        else if (x == 'SES')
            this.protein.surface = $3Dmol.SurfaceType.SES;
        else if (x == 'VDW')
            this.protein.surface = $3Dmol.SurfaceType.VDW;

        this.set_color(this.state.color_scheme);
    }

    //change output for min_isoval range
    set_min_isoval(min_val) {
        document.querySelector('#min_isoval').value = min_val;
        this.protein.min_isoval = min_val;
        this.update_surface(0);
    }

    //change output for max_isoval range
    set_max_isoval(max_val) {
        document.querySelector('#max_isoval').value = max_val; 
        this.protein.max_isoval = max_val;
        this.update_surface(0);
    }

    //reset min and max isovals
    reset_vals() {
        this.set_min_isoval2(-5);
        this.set_max_isoval2(5);
        // document.getElementById("min_isoval2").value = "-5";
        // document.getElementById("max_isoval2").value = "5";
        this.update_surface(0);
        // return false;
    }
    
    //change output for min_isoval range, not perfect
    set_min_isoval2(min_val) {
        // document.getElementById("min_isoval").innerHTML = min_val;
        this.protein.min_isoval = Number(min_val);
        this.setState({ min_isoval: min_val })
        // console.log(document.getElementById('min_isoval').value);
        this.update_surface(0);
    }

    //change output for max_isoval range, not perfect
    set_max_isoval2(max_val) {
        // document.getElementById("max_isoval").innerHTML = max_val;
        this.protein.max_isoval = Number(max_val);
        this.setState({ max_isoval: max_val })
        this.update_surface(0);
    }

    getpqr(jobid, pqr_prefix, storage_url){
        if( !this.pqr_loaded ){
            let self = this
            let xhr = new XMLHttpRequest();
            //jobid = 14357857643;
            let url = storage_url+"/"+jobid+"/"+pqr_prefix+".pqr";
            // console.log(url)
            // url = "http://nbcr-222.ucsd.edu/pdb2pqr_2.1.1/tmp/"+jobid+"/"+jobid+".pqr";
            //url = "../3dmol/files/1fas.pqr";
            xhr.open("GET", url);
            //xhr.responseType = 'blob';
    
            xhr.onload = function(e) {
              if (this.status == 200) {
                // Note: .response instead of .responseText
                //var blob = new Blob([this.response], {type: 'text/plain'});
                //readText(this.response);
                self.addpqr(this.response);
                self.pqr_loaded = true
              }
              
            };
            xhr.send(null);
        }
    }

    getcube(jobid, pqr_prefix, storage_url){
        if( !this.cube_loaded ){
            let self = this
            let xhr = new XMLHttpRequest();
            xhr.open("GET", storage_url+"/"+jobid+"/"+pqr_prefix+".cube");
            // console.log(storage_url+"/"+jobid+"/"+jobid+".cube")
            // xhr.open("GET", "http://nbcr-222.ucsd.edu/pdb2pqr_2.1.1/tmp/"+jobid+"/"+jobid+".cube");
            //xhr.open("GET", "../3dmol/files/1fas.cube");
            //xhr.responseType = 'blob';
    
            xhr.onload = function(e) {
              if (this.status == 200) {
                // Note: .response instead of .responseText
                //var blob = new Blob([this.response], {type: 'text/plain'});
                //readText(this.response);
                self.addcube(this.response);
                self.cube_loaded = true
              }
              
            };
            xhr.send(null);
            
        }
    }

    // build_page(){
    //     //jobid = 1234;
    //     document.title = "3Dmol Visualization " + this.jobid
    
    //     let a = 
    //     "<div id='gldiv'></div>" +
    //     "<!--<hr style='margin: 0;'>-->" +
    //     "<br>" +
    //     "<div id='outer'>" +
    //     "<div id='buttons'>" 
        
    //     //change surface
    //     let b = 
    //     "<!--<br><table border='1' width='100%' cellspacing='0' cellpadding='0'><tr><td valign='top'>--> " +
    //     "<font style='color:white; font-size:12pt'>Surface:</font>" + 
    //     "<br>" +
    //     "    <select class='styled-select' id='selected_surface' onchange='update_surface(1)' style='max-width:50%;'>" +
    //     "       <option style='color: black;' value='SAS'>Solvent Accessible</option>" +
    //     "<option style='color: black;' value='SES'>Solvent Excluded</option>" +
    //     "<option style='color: black;' value='VDW'>Van Der Waals</option>" +
    //     "</select><br>" +
        
    //     "<!--<div class='inner'><ul class='button-group round' class='leftbutton'><input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black' value='On' onclick='on_surface()'></button></input>" +
        
    //     "    <input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black' input type='button' value='Off' onclick='glviewer.removeSurface(surf)'></button></input></ul></div><br>-->" +
        
    //     "<table border='0' cellspacing='0' cellpadding='0'><tr><td>" +
    //     "<label class='switch1'> " +
    //         "<input class='switch1-input' type='checkbox' onclick='surface_vis(this)' checked/>" +
    //         "<span class='switch1-label' data-on='Show' data-off='Hide'></span> " +
    //         "<span class='switch1-handle'></span>" +
    //     "</label>" +
        
    //     "</td>" +
        
    //     "<td>" +
    //     "<!--<div class='inner'><ul class='button-group round' class='rightbutton'><input type='button' button class='button-labela pure-button' style='width: 85px; height: 30px; color: black; font-size: 10pt' value='Translucent' onclick='update_surface(2)'></button></input>" +
        
    //     "    <input type='button' button class='button-unlabela pure-button' style='width: 85px; height: 30px; color: black' input type='button' value='Opaque' onclick='update_surface(3)'></button></input></ul></div>-->" +
        
    //     "<label class='switch2'>" +
    //         "<input class='switch2-input' type='checkbox' onclick='surface_opacity(this)' checked/>" +
    //         "<span class='switch2-label'   data-on='Opaque' data-off='Translucent'></span> " +
    //         "<span class='switch2-handle'></span> " +
    //     "</label>" +
        
    //     "</td></tr></table>"+
        
    //     "<br><font style='color:white; font-size:12pt'>Surface Potential:</font>" +
        
    //     //change min isoval
    //     " <p style='color:white; font-size: 16px'> Min <input type=range min=-50 max=50 value=-5 id='min_isoval2' step=1 oninput='set_min_isoval2(value)'>&nbsp;&nbsp;&nbsp;&nbsp;<span id='min_isoval'>-5 </span> kT/e </p>  " +
        
    //     //change max isoval
    //     " <p style='color:white; font-size: 16px'> Max <input type=range min=-50 max=50 value=5 id='max_isoval2' step=1 oninput='set_max_isoval2(value)'>&nbsp;&nbsp;&nbsp;&nbsp;<span id='max_isoval'> 5 </span> kT/e </p>  " +
        
    //     //reset button
    //     "<div class='inner'><ul class='button-group round'></input>" +
    //     "    <input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black' input type='button' value='Reset' onclick='reset_vals()'></button></input></ul></div>" +
        
    //     "<br><font style='color:white; font-size:12pt'>Model:</font>&nbsp;&nbsp;" +
        
    //     "<select class='styled-select' id='selected_vis' onchange='set_vis()' style='max-width:50%;'>"+
    //     "        <option style='color: black;' value='line'>Line </option> "+
    //     "        <option style='color: black;' value='stick'>Stick </option>" +
    //     "        <option style='color: black;' value='cross'>Cross </option>"+
    //     "        <option style='color: black;' value='sphere'>Sphere </option>"+
    //     "        <option style='color: black;' value='cartoon'>Cartoon </option>"+
    //     "    </select>" 
    //     +  "<br><br>"  +
        
    //     //change color scheme 
    //     "<font style='color:white; font-size:12pt'>Scheme: </font>" +
        
        
        
    //     "<select class='styled-select' id='selected_scheme' onchange='update_surface(0);show_colorbar();' style='max-width:50%;'>" +
        
    //     "        <option style='color: black;' value='RWB'>Red-White-Blue </option>" +
    //     "        <option style='color: black;' value='RGB'>Red-Green-Blue </option>" +
    //     "        <!--<option style='color: black;' value='BWR'>Blue-White-Red </option>-->" +
    //     "    </select><br>" +
    //     "<!--<table border='0' cellspacing='0'><tr><td valign='top'>RWB<br>RGB</td><td valign='top'><img src='/viz/static/3dmol/images/rwb.png' width='250'><br><img src='/viz/static/3dmol/images/rgb.png' width='250'></td></tr></table>-->" +
    //     "<span id='colorbar'><img id='rwb' src='/viz/static/3dmol/images/rwb.png' width='250'></span>" +
        
    //     "    <!--<div class='inner'><ul class='button-group round'><input type='button' button class='button-labela pure-button' style='width: 90px; height: 30px; color: black' value='Add labels'" +
    //     "        onclick='addLabels(glviewer); glviewer.render();'></button></input>" +
    //     "    <input type='button' button class='button-unlabela pure-button' style='width: 95px; height: 30px; color: black' value='Remove labels'" +
    //     "        onclick='removetheLabels(glviewer); glviewer.render();'></button></input></ul></div>-->"  +
        
    //     "<table><tr><td>" +
    //     "<font style='color:white; font-size:12pt'>Labels: </font></td><td><label class='switch3'>" +
    //         "<input class='switch3-input' onclick='surface_labels(this)' type='checkbox' checked/>" +
    //         "<span class='switch3-label' data-on='Remove' data-off='Add'></span>" +
    //         "<span class='switch3-handle'></span> " +
    //     "</label>" +
        
    //     "</td></tr></table>"+
        
        
    //     "<div class='inner'><ul class='button-group round'><input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black' input type='button' value='Recenter' onclick='glviewer.zoomTo();'></button></input></ul></div>" +
        
    //     // Background Transparency slider
    //     "<div id='transparency-div'>"+
    //     // "<br><font style='color:white; font-size:12pt'>Background Transparency:</font>" +
    //     "<font style='color:white; font-size:12pt'>Background Transparency:</font>" +
    //     " <p style='color:white; font-size: 16px'> <input type=range min=0 max=100 value=0 id='transparency_slider' step=5 oninput='adjustBackgroundTransparency(value)'>&nbsp;&nbsp;&nbsp;&nbsp; <span id='bg_alpha_val'> 0 </span> </p>  " +
    //     "</div>"+
        
    //     // Export Options
    //     "<div>" + 
    //     "	<font style='color:white; font-size:12pt'>Export as: </font>" +
    //     `	<select class='styled-select' id='select_export_type' onchange='renderExportButtonText(value)' style='max-width:50%;'>`+
    //     "       <option style='color: black;' value='png'> PNG </option> "+
    //     "       <option style='color: black;' value='pymol'> PyMol </option>" +
    //     "   	<option style='color: black;' value='unitymol'> UnityMol </option>"+
    //     "   </select>" +
        
        
    //     // Export button
    //     "	<div class='inner'><ul class='button-group round'><input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black; margin-top: 10px' input type='button' id='export-button' value='Export' onclick='savePng()'></button></input></ul></div>" +
    //     "</div>" + 
        
        
    //     // Save PNG button
    //     // "<div class='inner'><ul class='button-group round'><input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black' input type='button' value='Save PNG' onclick='savePng();'></button></input></ul></div>" +
        
    //     // End
    //     "<br></div></div>" +
    //     "<!--</td></tr></table>-->" 
    
    //     return( a + b)
    
    // }

    update_selected_surface(e, option){
        this.update_surface(option);
        this.setState({
            // surface_type: e.target.value
            surface_type: e
        })
    }

    update_selected_scheme(e){
        this.update_surface(0, e);
        // this.set_color();
        this.show_colorbar(e);
        this.setState({
            color_scheme: e
        })
    }

    build_page(){
        let self = this
        return(
            <div>
                <div id='gldiv'></div>
                {/* <!--<hr style='margin: 0;'>--> */}
                <br/>
                <div id='outer'>
                    <div id='buttons'>
                
                        {/* <!--<br><table border='1' width='100%' cellspacing='0' cellpadding='0'><tr><td valign='top'>-->  */}
                        <font style={{color: 'white', fontSize:'12pt'}}>Surface:</font>
                        <br/>
                        {/* <select className='styled-select' id='selected_surface' value={this.state.surface_type} onChange={(e) => this.update_surface(e, 1)} style={{maxWidth:'50%'}}> */}
                        {/* <select className='styled-select' id='selected_surface' value={this.state.surface_type} onChange={(e) => this.update_selected_surface(e, 1)} style={{maxWidth:'50%'}}>
                            <option style={{color: 'black'}} value='SAS'>Solvent Accessible</option>
                            <option style={{color: 'black'}} value='SES'>Solvent Excluded</option>
                            <option style={{color: 'black'}} value='VDW'>Van Der Waals</option>
                        </select> */}
                        <Select className='styled-select' id='selected_surface' value={this.state.surface_type} onChange={(e) => this.update_selected_surface(e, 1)} style={{maxWidth:'80%'}}>
                            <Option style={{color: 'black'}} value='SAS'>Solvent Accessible</Option>
                            <Option style={{color: 'black'}} value='SES'>Solvent Excluded</Option>
                            <Option style={{color: 'black'}} value='VDW'>Van Der Waals</Option>
                        </Select>
                        <br/>
                        
                        {/* <!--<div class='inner'><ul class='button-group round' class='leftbutton'><input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black' value='On' onclick='on_surface()'></button></input>
                        
                            <input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black' input type='button' value='Off' onclick='glviewer.removeSurface(surf)'></button></input></ul></div><br>--> */}
                        
                        <table border='0' cellspacing='0' cellpadding='0'><tr><td>
                        <label className='switch1'> 
                            {/* <input className='switch1-input' type='checkbox' onClick='surface_vis(this)' checked/> */}
                            {/* <input className='switch1-input' type='checkbox' onClick={(e) => self.surface_vis(e)} checked/> */}
                            <Switch 
                                // className='switch3-input'
                                checkedChildren='Show'
                                unCheckedChildren='Hide'
                                defaultChecked
                                onClick={(e) => this.surface_vis(e)}
                            />
                            {/* <span className='switch1-label' data-on='Show' data-off='Hide'></span> 
                            <span className='switch1-handle'></span> */}
                        </label>
                        
                        </td>
                        
                        <td>
                        {/* <!--<div class='inner'><ul class='button-group round' class='rightbutton'><input type='button' button class='button-labela pure-button' style='width: 85px; height: 30px; color: black; font-size: 10pt' value='Translucent' onclick='update_surface(2)'></button></input>
                        
                            <input type='button' button class='button-unlabela pure-button' style='width: 85px; height: 30px; color: black' input type='button' value='Opaque' onclick='update_surface(3)'></button></input></ul></div>--> */}
                        
                        <label className='switch2'>
                            {/* <input className='switch2-input' type='checkbox' onClick='surface_opacity(this)' checked/>
                            <span className='switch2-label'   data-on='Opaque' data-off='Translucent'></span> 
                            <span className='switch2-handle'></span>  */}
                            <Switch 
                                // className='switch3-input'
                                checkedChildren='Opaque'
                                unCheckedChildren='Translucent'
                                defaultChecked
                                onClick={(e) => this.surface_opacity(e)}
                            />
                        </label>
                        
                        </td></tr></table>
                        
                        <br/><font style={{color: 'white', fontSize:'12pt'}}>Surface Potential:</font>
                        
                        {/* change min isoval */}
                        {/* <p style={{color: 'white', fontSize: '16px'}}> Min <input type='range' min={-50} max={50} value={-5} id='min_isoval2' step={1} oninput='set_min_isoval2(value)'/>&nbsp;&nbsp;&nbsp;&nbsp;<span id='min_isoval'>-5 </span> kT/e </p> */}
                        {/* <Slider 
                            min={-50}
                            max={50}
                            value={-5}
                            marks={{
                                '-50': '-50 kT/e',
                                '50':  '50 kT/e'
                            }}
                        /> */}
                        <Row>
                            <p style={{color: 'white', fontSize: '16px'}}> Min </p>
                            <Col span={12}>
                            {/* <br/> */}
                            <Slider 
                                min={-50}
                                max={50}
                                step={1}
                                // value={-5}
                                // value={this.protein.min_isoval}
                                value={this.state.min_isoval}
                                onChange={(e) => this.set_min_isoval2(e)}
                                // marks={{
                                //     '-50': '-50 kT/e',
                                //     '50':  '50 kT/e'
                                // }}
                            />
                            </Col>
                            <Col span={4}>
                            <InputNumber
                                min={-50}
                                max={50}
                                style={{ margin: '0 16px' }}
                                value={this.state.min_isoval}
                                formatter={value => `${value} kT/e`}
                                parser={value => value.replace(/[^-0-9]+/g, '')}
                                // value={this.protein.min_isoval}
                                onChange={(e) => this.set_min_isoval2(e)}
                                // disabled
                            />
                            </Col>
                        </Row>                        

                        {/* change max isoval */}
                        {/* <p style={{color: 'white', fontSize: '16px'}}> Max <input type='range' min={-50} max={50} value={5} id='max_isoval2' step={1} oninput='set_max_isoval2(value)'/>&nbsp;&nbsp;&nbsp;&nbsp;<span id='max_isoval'> 5 </span> kT/e </p> */}
                        <Row>
                            <p style={{color: 'white', fontSize: '16px'}}> Max </p>
                            <Col span={12}>
                            {/* <br/> */}
                            <Slider 
                                min={-50}
                                max={50}
                                step={1}
                                value={this.state.max_isoval}
                                onChange={(e) => this.set_max_isoval2(e)}
                                // marks={{
                                //     '-50': '-50 kT/e',
                                //     '50':  '50 kT/e'
                                // }}
                            />
                            </Col>
                            <Col span={4}>
                            <InputNumber
                                min={-50}
                                max={50}
                                style={{ margin: '0 16px' }}
                                value={this.state.max_isoval}
                                formatter={value => `${value} kT/e`}
                                parser={value => value.replace(/[^-0-9]+/g, '')}
                                onChange={(e) => this.set_max_isoval2(e)}
                                // disabled
                            />
                            </Col>
                        </Row>                        
                        
                        {/* reset button */}
                        {/* <div class='inner'><ul class='button-group round'></input> */}
                        <div className='inner'>
                            <ul className='button-group round'>
                                <input type='button' button className='button-backbone pure-button' style={{width: '85px', height: '30px', color: 'black'}} input type='button' value='Reset' onClick={this.reset_vals}></input>
                            </ul>
                        </div>
                        
                        <br/><font style={{color:'white', fontSize: '12pt'}}>Model:</font>&nbsp;&nbsp;
                        
                        {/* <select className='styled-select' id='selected_vis' value={this.model_type} onChange={this.set_vis} style={{maxWidth: '50%'}}>
                            <option style={{color: 'black'}} value='line'>Line </option> 
                            <option style={{color: 'black'}} value='stick'>Stick </option>
                            <option style={{color: 'black'}} value='cross'>Cross </option>
                            <option style={{color: 'black'}} value='sphere'>Sphere </option>
                            <option style={{color: 'black'}} value='cartoon'>Cartoon </option>
                        </select>  */}
                        <Select className='styled-select' id='selected_vis' value={this.state.model_type} onChange={this.set_vis} style={{maxWidth: '50%'}}>
                            <Option style={{color: 'black'}} value='line'>Line </Option> 
                            <Option style={{color: 'black'}} value='stick'>Stick </Option>
                            <Option style={{color: 'black'}} value='cross'>Cross </Option>
                            <Option style={{color: 'black'}} value='sphere'>Sphere </Option>
                            <Option style={{color: 'black'}} value='cartoon'>Cartoon </Option>
                        </Select> 
                        <br/><br/>
                        
                        {/* Change color scheme  */}
                        <font style={{color: 'white', fontSize: '12pt'}}>Scheme: </font>
                        
                        
                        
                        {/* <select className='styled-select' id='selected_scheme' onChange='update_surface(0);show_colorbar();' style={{maxWidth:'50%'}}> */}
                        {/* <select className='styled-select' id='selected_scheme' onChange={(e) => this.update_selected_scheme(e, 1)} style={{maxWidth:'50%'}}>
                        
                                <option style={{color: 'black'}} value='RWB'>Red-White-Blue </option>
                                <option style={{color: 'black'}} value='RGB'>Red-Green-Blue </option>
                                <!--<option style='color: black;' value='BWR'>Blue-White-Red </option>-->
                            </select><br/> */}
                        {/* <Select className='styled-select' id='selected_scheme' value={this.state.color_scheme} onChange={(e) => this.update_selected_scheme(e)} style={{maxWidth:'50%'}}> */}
                        <Select className='styled-select' id='selected_scheme' value={this.state.color_scheme} onChange={(e) => this.update_selected_scheme(e)}>
                            <Option style={{color: 'black'}} value='RWB'>Red-White-Blue </Option>
                            <Option style={{color: 'black'}} value='RGB'>Red-Green-Blue </Option>
                        </Select><br/>
                        {/* // <!--<table border='0' cellspacing='0'><tr><td valign='top'>RWB<br>RGB</td><td valign='top'><img src='/viz/static/3dmol/images/rwb.png' width='250'><br><img src='/viz/static/3dmol/images/rgb.png' width='250'></td></tr></table>--> */}
                        {/* <span id='colorbar'><img id='rwb' src='/viz/static/3dmol/images/rwb.png' width='250'/></span> */}
                        <span id='colorbar'><img id='rwb' src={this.state.colorbar_image} width='250'/></span>
                        
                            {/* <!--<div class='inner'><ul class='button-group round'><input type='button' button class='button-labela pure-button' style='width: 90px; height: 30px; color: black' value='Add labels'
                                onclick='addLabels(glviewer); glviewer.render();'></button></input>
                            <input type='button' button class='button-unlabela pure-button' style='width: 95px; height: 30px; color: black' value='Remove labels'
                                onclick='removetheLabels(glviewer); glviewer.render();'></button></input></ul></div>--> */}
                        
                        <table><tr><td>
                        <font style={{color:'white', fontSize:'12pt'}}>Labels: </font></td><td><label className='switch3'>
                            {/* <input className='switch3-input' onClick='surface_labels(this)' type='checkbox' checked/> */}
                            {/* <input className='switch3-input' onClick='surface_labels(this)' type='checkbox' checked/> */}
                            {/* <input className='switch3-input' onClick={(e) => this.surface_labels(e)} type='checkbox' checked/> */}
                            <Switch 
                                // className='switch3-input'
                                checkedChildren='Add'
                                unCheckedChildren='Remove'
                                // defaultChecked
                                onClick={(e) => this.surface_labels(e)}
                            />
                            {/* <span className='switch3-label' data-on='Remove' data-off='Add'></span>
                            <span className='switch3-handle'></span>  */}
                        </label>
                        
                        </td></tr></table>
                        
                        
                        {/* <div className='inner'><ul className='button-group round'><input type='button' button className='button-backbone pure-button' style={{width: '85px', height: '30px', color: 'black'}} input type='button' value='Recenter' onClick='glviewer.zoomTo();'></input></ul></div> */}
                        <div className='inner'><ul className='button-group round'><input type='button' button className='button-backbone pure-button' style={{width: '85px', height: '30px', color: 'black'}} input type='button' value='Recenter' onClick={(e) => {self.glviewer.zoomTo()}}></input></ul></div>
                        
                        {/* Background Transparency slider */}
                        <div id='transparency-div'>
                            {/* // "<br><font style='color:white; font-size:12pt'>Background Transparency:</font>" + */}
                            <font style={{color:'white', fontSize:'12pt'}}>Background Transparency:</font>
                            <p style={{color:'white', fontSize: '16px'}}> <input type='range' min={0} max={100} value={0} id='transparency_slider' step={5} onInput='adjustBackgroundTransparency(value)'/>&nbsp;&nbsp;&nbsp;&nbsp; <span id='bg_alpha_val'> 0 </span> </p>
                            
                            {/* Export Options */}
                            <div>
                                <font style={{color: 'white', fontSize:'12pt'}}>Export as: </font>
                                <select className='styled-select' id='select_export_type' onChange='renderExportButtonText(value)' style={{maxWidth:'50%'}}>
                                    <option style={{color: 'black'}} value='png'> PNG </option>
                                    <option style={{color: 'black'}} value='pymol'> PyMol </option>
                                    <option style={{color: 'black'}} value='unitymol'> UnityMol </option>
                                </select>
                            </div>
                            
                            
                            {/* Export button */}
                                <div className='inner'><ul className='button-group round'><input type='button' button className='button-backbone pure-button' style={{width: '85px', height: '30px', color: 'black', marginTop: '10px'}} input type='button' id='export-button' value='Export' onclick='savePng()'></input></ul></div>
                        </div>
                        
                        
                        {/* Save PNG button */}
                        {/* // "<div class='inner'><ul class='button-group round'><input type='button' button class='button-backbone pure-button' style='width: 85px; height: 30px; color: black' input type='button' value='Save PNG' onclick='savePng();'></button></input></ul></div>" + */}
                        
                        {/* End */}
                        {/* <br/> */}
                    </div>
                    
                </div>
                {/* <!--</td></tr></table>-->  */}
            </div>
        )
    }

    render(){
        // let apbs_block = '$ apbs [options] input-file'
        // let pdb2pqr_block = '$ pdb2pqr [options] --ff={forcefield} {pdb-path} {output-path}'
        let jobid = this.props.query.jobid
        let pqr_prefix = this.props.query.pqr
        let storage_host = window._env_.OUTPUT_BUCKET_HOST
        console.log('WE ARE RENDERING')
        return(
            
            <div>
                <div>
                    {/* <link rel="stylesheet" type="text/css" href="/viz/static/3dmol/css/pure-min.css" media="screen" />
                    <script type="text/JavaScript" src="/viz/static/3dmol/js/pitt_3Dmol.js"></script>
                    <script type="text/JavaScript" src="/viz/static/lib/jszip.min.js"></script>
                    <script type="text/JavaScript" src="/viz/static/lib/FileSaver.min.js"></script>
                    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
                    <script type="text/JavaScript" src="/viz/static/3dmol/js/visualize_html.js"></script>
                    <script type="text/JavaScript" src="/viz/static/3dmol/js/3dmol.js"></script>

                    */}
                </div>
                <div>
                    {/* {build_page(`${ jobid }, '${ storage_host }`)}
                    {getpqr(`${ jobid }', '${ pqr_prefix }', '${ storage_host }`)}
                    {getcube(`${ jobid }', '${ pqr_prefix }', '${ storage_host }`)} */}
                    
                    {/* {build_page(jobid, storage_host)}
                    {getpqr(jobid, pqr_prefix, storage_host)}
                    {getcube(jobid, pqr_prefix, storage_host)} */}

                    {this.build_page()}
                    {this.getpqr( this.jobid, this.pqr_prefix, this.storage_host )}
                    {this.getcube( this.jobid, this.pqr_prefix, this.storage_host )}
                    {/* {this.getpqr( this.jobid, this.pqr_prefix, this.storage_host )} */}
                </div>
            </div>
        )
    }
}

export default VizLegacyPage