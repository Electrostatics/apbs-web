import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css';
import { Layout, Col, Row } from 'antd';
import { Typography } from 'antd';
import { Switch, Slider, InputNumber } from 'antd';
import { Select } from 'antd';
import { Button } from 'antd';

import * as JSZip from 'jszip';
import * as Pako from 'pako';
import { saveAs } from 'file-saver';

// import { ExportOutlined } from '@ant-design/icons'
import * as $3Dmol from '3dmol/build/3Dmol'

// Styles and images
// import './viz/static/3dmol/css/foundation.css'
// import './viz/static/3dmol/css/pure-min.css'
// import './viz/static/3dmol/css/pdb2pqr_3dmol.css'
import './viz/static/3dmol/css/toggles.css'
import RWB_image from './viz/static/3dmol/images/rwb.png'
import RGB_image from './viz/static/3dmol/images/rgb.png'
import '../styles/old-viz-layout.css';

const { Content } = Layout;
const { Title, Text, Link } = Typography;
const { Option } = Select;

class VizLegacyPage extends Component{
    constructor(props){
        super(props)
        if( window._env_.GA_TRACKING_ID !== "" ) 
            ReactGA.pageview(window.location.pathname + window.location.search)

        let query_args = new URLSearchParams(this.props.query)

        this.jobid = query_args.get('jobid')
        this.jobdate = query_args.get('date')
        this.pqr_prefix = query_args.get('pqr')
        this.use_gzip = true ? query_args.get('gz') === 'true' : false
        
        this.dx_objectname = null
        this.decompress_dx_file = null

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


        this.surface_type = 'SAS'
        this.glviewer = null;
        this.volumedata = null;
        this.surf = null;
        this.surfaceOn = true
        this.surfaceOpacity = true
        this.labels = [];
        this.modelLabels = false

        // Initial render flags
        this.pqr_loaded = false
        this.volume_loaded = false
        this.cube_loaded = false
        this.dx_loaded = false

        this.state = {
            jobid: query_args.get('jobid'),
            pqr_prefix: query_args.get('pqr'),
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

            // BG Transparency
            transparancy_val: 0,

            // Export options
            export_type: 'png',
            disable_export_menu: false,
            disable_export_button: false,
        }

        // General bindings
        this.set_vis = this.set_vis.bind(this)
        this.reset_vals = this.reset_vals.bind(this)

        // Surface bindings
        this.update_surface = this.update_surface.bind(this)
        this.update_selected_surface = this.update_selected_surface.bind(this)
        this.update_selected_scheme = this.update_selected_scheme.bind(this)

        // Toggle bindings
        // this.toggleSurface = this.toggleSurface.bind(this)

        // Export bindings
        this.handleExportClick = this.handleExportClick.bind(this)
    }

    componentDidMount(){
        console.log('loading GL viewer')
        this.glviewer = this.createGlViewer()

        // Find related volume data filename
        this.findSurfacePotentialFilename()
        .then(() => {
            // Load molecule and surface
            this.getpqr( this.jobid, this.pqr_prefix, this.storage_host )
            this.get_volume_data( this.jobid, this.pqr_prefix, 'dx' )    
        })
    }

    usingJobDate(){
        if( this.jobdate !== null && this.jobdate !== undefined )
            return true
        else
            return false
    }

    findSurfacePotentialFilename(){
        // Download APBS status
        // Read output file list
        // Find DX file
        //      - if .dx.gz is available, return file_name .dx.gz
        //      - else return file_name w/ .dx
        let status_objectname
        if( this.usingJobDate() ){
            status_objectname = `${this.jobdate}/${this.jobid}/apbs-status.json`
        }else{
            status_objectname = `${this.jobid}/apbs-status.json`
        }
        let apbs_status_url = `${window._env_.OUTPUT_BUCKET_HOST}/${status_objectname}`
        return fetch(apbs_status_url)
        .then(response => response.json())
        .then(data => {
            for( let object_name of data['apbs'].outputFiles){
                if( object_name.endsWith('.gz.dx') ){
                    this.dx_objectname = object_name
                    this.decompress_dx_file = true
                    break
                }else if( object_name.endsWith('.dx') ){
                    this.dx_objectname = object_name
                    this.decompress_dx_file = false
                }
            }
        })
        .catch(error => { console.error(error) })
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

    getpqr(jobid, pqr_prefix, storage_url){
        if( !this.pqr_loaded ){
            let self = this
            // let xhr = new XMLHttpRequest();
            // jobid = 14357857643;
            // let url = storage_url+"/"+jobid+"/"+pqr_prefix+".pqr";
            let pqr_url
            if( this.usingJobDate() ){
                pqr_url = `${storage_url}/${this.jobdate}/${jobid}/${pqr_prefix}.pqr`
            }else{
                pqr_url = `${storage_url}/${jobid}/${pqr_prefix}.pqr`
            }

            fetch(pqr_url)
            .then(response => response.text())
            .then(data => {
                self.addpqr(data);
                self.pqr_loaded = true
            })
        }
    }

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

    get_volume_data(jobid, pqr_prefix, format){
        if( !this.volume_loaded ){
            let self = this
            let volume_objectname = this.dx_objectname

            // let volume_filename
            // if(format === 'dx')
            //     volume_filename = `${pqr_prefix}-pot.dx.gz`

            // else if(format === 'cube')
            //     volume_filename = `${pqr_prefix}.cube.gz`

            // Retrieve file from S3
            let volume_url = `${window._env_.OUTPUT_BUCKET_HOST}/${volume_objectname}`

            if( this.decompress_dx_file ){
                // Decompress gzipped file data
                fetch(volume_url)
                .then( response => response.arrayBuffer() )
                .then( data => {
                    let inflated_response = Pako.inflate(data, {to: 'string'})
                    self.add_volume(inflated_response, format)
                    self.volume_loaded = true
                })
            }else{
                // Load raw file data (no gzip)
                fetch(volume_url)
                .then( response => response.text() )
                .then( data => {
                    self.add_volume(data, format)
                    self.volume_loaded = true
                })
            }
        }
    }

    add_volume(volumedata, format){
        this.volumedata = new $3Dmol.VolumeData(volumedata, format);
        this.glviewer.render();
        this.create_surface();
    }

    getcube(jobid, pqr_prefix, storage_url){
        if( !this.cube_loaded ){
            let self = this
            let xhr = new XMLHttpRequest();
            // let cube_url = `${storage_url}/${jobid}/${pqr_prefix}.cube`
            let cube_url = `${storage_url}/${jobid}/${pqr_prefix}.cube.gz`
            
            // Get file 
            fetch(cube_url)
            // .then( response => response.text() )
            // .then( data => {
            //     self.addcube(data);
            //     self.cube_loaded = true
            // })
            .then( response => response.arrayBuffer() )
            .then( data => {
                let inflated_response = Pako.inflate(data, {to: 'string'})
                self.addcube(inflated_response);
                self.cube_loaded = true
            })

        }
    }

    addcube(volumedata){
        //protein.volumedata = volumedata;
        this.volumedata = new $3Dmol.VolumeData(volumedata, "cube");
        // this.volumedata = new $3Dmol.VolumeData(volumedata, "cube.gz");
        
        // window.volumedata = new $3Dmol.VolumeData(volumedata, "cube");
        //glviewer.addIsosurface(volumedata, {isoval: -5, color:"red", smoothness: 10})
        //glviewer.addIsosurface(volumedata, {isoval: 5, color:"blue", smoothness: 1})
        
        this.glviewer.render();
        this.create_surface();
    };

    get_dx(jobid, pqr_prefix, storage_url){
        if( !this.dx_loaded ){
            let self = this
            let dx_url = `${storage_url}/${jobid}/${pqr_prefix}-pot.dx.gz`

            // Get file 
            fetch(dx_url)
            .then( response => response.arrayBuffer() )
            .then( data => {
                let inflated_response = Pako.inflate(data, {to: 'string'})
                self.add_dx(inflated_response);
                self.dx_loaded = true
            })
            
        }
    }

    add_dx(volumedata){
        //protein.volumedata = volumedata;
        this.volumedata = new $3Dmol.VolumeData(volumedata, "dx");
        // window.volumedata = new $3Dmol.VolumeData(volumedata, "cube");
        //volumedata = $("#volumetric_data").val();
        //glviewer.addIsosurface(volumedata, {isoval: -5, color:"red", smoothness: 10})
        //glviewer.addIsosurface(volumedata, {isoval: 5, color:"blue", smoothness: 1})
        
        this.glviewer.render();
        this.create_surface();
    };

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
            // let x = e.value;
            let x = this.surface_type;
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
        // this.setState({ surfaceOn: e })
        this.surfaceOn = e 
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
        // this.setState({ surfaceOpacity: make_opaque })
        // this.surfaceOpacity = make_opaque
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
        
        // if( this.state.surfaceOn ){
        if( this.surfaceOn ){
            this.surf = this.glviewer.addSurface(this.protein.surface, {opacity:this.protein.opacity, voldata: this.volumedata, volscheme: volscheme_to_use});
        }

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

    adjustBackgroundTransparency(alpha_val){
        // document.getElementById("bg_alpha_val").innerHTML = alpha_val;
        this.setState({ transparancy_val: alpha_val })
        this.glviewer.setBackgroundColor('black', 1-(alpha_val/100))
        this.glviewer.render()    
    }


    update_selected_surface(e, option){
        this.surface_type = e
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

    enableExportOptions(enable_button){
        this.setState({
            disable_export_menu: !enable_button,    // export button
            disable_export_button: !enable_button   // select export-type button
        })
    }

    handleExportClick(){
        if( this.state.export_type === 'png' ){
            this.savePng()
            // TODO: Use native glviewer export
        }
        else if( this.state.export_type === 'pymol' ){
            this.savePymol()
        }
        else if( this.state.export_type === 'unitymol' ){
            this.saveUnitymol()
        }
    }

    // Adapted from the savePng function from new versions of 3Dmol
    savePng(){
        // Get query string params
        // let querystring_params = (new URL(document.location)).searchParams
        let job_id = this.state.jobid
        // let pqr_name = this.state.pqr_prefix

        // Retrieve 3Dmol canvas data from GLViewer
        let filename = `${job_id}_3dmol.png`;
        let text = this.glviewer.pngURI();
        let ImgData = text;

        // Create anchor element from which to download image
        let link = document.createElement('a');
        link.href = ImgData;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    // Create and download PyMol script
    // TODO: 2020/12/06, Elvis - Explore writing export script based on template file rather than in code
    savePymol(){
        let job_id = this.state.jobid
        let script_filename = `${job_id}_PyMol.pml`
        let zip_export_filename = `${job_id}_PyMol.zip`

        // Set beginning text
        const heading_text = 
            '# As long as the .pqr and .dx files are in this same directory, no path to the files is necessary\n'
            + '# If needed, be sure to unzip any *.gz files referenced in this script\n\n'

            + '# Drag this script into an open PyMOL window\n'
            + '# The model will be loaded and also saved as a .pse file for ease of starting over\n\n'

            + '# Load the files\n'

        // Set file/path names
        const structure_name = `${job_id}_APBS`
        const pqr_name = `${job_id}.pqr`
        // const dx_name = `${job_id}-pot.dx`
        const dx_name = this.dx_objectname.split('/').slice(-1)

        // Write remainder text
        const remaining_text = 
            `load ${pqr_name}, molecule\n`
            + `load ${dx_name}, electrostaticmap\n\n`

            + `# Set scale for coloring protein surface\n`
            + `ramp_new espramp, electrostaticmap, [ -3, 0, 3]\n\n`
            
            + `# Show the surface\n`
            + `show surface\n\n`
            
            + `# Set surface colors from dx\n`
            + `set surface_color, espramp\n`
            + `set surface_ramp_above_mode\n\n`
            
            + `# Setup export\n`
            + `set pse_export_version, 1.7\n\n`

            + `# Save file as .pse\n`
            + `save ${structure_name}.pse\n`


        // Combine and create full script text
        const all_data = heading_text + remaining_text

        // Download PyMol file
        this.bundleScriptFiles(job_id, zip_export_filename, script_filename, all_data, [pqr_name, dx_name])
    }

    // Create and download UnityMol script
    // TODO: 2020/12/06, Elvis - Explore writing export script based on template file rather than in code
    saveUnitymol(){
        let job_id = this.state.jobid
        let script_filename = `${job_id}_UnityMol.py`
        let zip_export_filename = `${job_id}_UnityMol.zip`
        
        // Set beginning text
        const heading_text = 
            '# As long as the .pqr and .dx files are in this same directory, no path to the files is necessary\n'
            + '# If needed, be sure to unzip any *.gz files referenced in this script\n\n'
            
            + '# Open this file in UnityMol using the "Load Script" button\n\n'

            + '# Load files\n'

        // Set file/path names
        const structure_name = `${job_id}_APBS`
        const pqr_name = `${job_id}.pqr`
        const dx_name = this.dx_objectname.split('/').slice(-1)

        // Write remainder text
        const remaining_text = 
            `load(filePath="${pqr_name}", readHetm=True, forceDSSP=False, showDefaultRep=True, center=False);\n`
            + `loadDXmap("${structure_name}", "${dx_name}")\n\n`
            
            + `# Set selection and center\n`
            + `setCurrentSelection("all(${structure_name})")\n`
            + `centerOnSelection("all(${structure_name})", True)\n\n`
            
            + `# Show surface\n`
            + `showSelection("all(${structure_name})", "s")\n\n`

            + `# Color surface by charge\n`
            + `colorByCharge("all(${structure_name})", False, -10.000, 10.000)\n\n`

        // Combine and create full script text
        const all_data = heading_text + remaining_text

        // Download UnityMol file
        this.bundleScriptFiles(job_id, zip_export_filename, script_filename, all_data, [pqr_name, dx_name])
    }

    // Download files and bundle via JSZip
    bundleScriptFiles(job_id, zip_filename, script_filename, script_data, inputfile_list){
        // Disable export button until export completes
        this.enableExportOptions(false)

        // Create zip archive
        let zipfile_basename = zip_filename.slice(0,-4)
        let zip_archive = new JSZip();
        console.log('zip archive created')
        
        // Add PyMol/UnityMol script to zip
        zip_archive.file(`${zipfile_basename}/${script_filename}`, script_data)
        console.log(`File '${script_filename}' added to archive`)
        
        // For every file in list, download and add to zip archive
        let promise_list = []
        let file_url_start
        if( this.usingJobDate() ){
            file_url_start = `${window._env_.OUTPUT_BUCKET_HOST}/${this.jobdate}/${job_id}`
        }else{
            file_url_start = `${window._env_.OUTPUT_BUCKET_HOST}/${job_id}`
        }
        console.log(window._env_.OUTPUT_BUCKET_HOST)
        for( let input_name of inputfile_list){
            let file_url = `${file_url_start}/${input_name}`
            console.log(`Fetching file '${input_name}'`)
            console.log(`${file_url}`)
            promise_list.push( fetch( file_url ) )
        }

        Promise.all(promise_list)
            .then((all_responses) => {
                for(let i=0; i < all_responses.length; i++){
                    let response = all_responses[i]
                    let fetched_file_name = inputfile_list[i]

                    // zip_archive.file(fetched_file_name, response.text())
                    // zip_archive.file(fetched_file_name, response.arrayBuffer(), {binary: true})
                    zip_archive.file(`${zipfile_basename}/${fetched_file_name}`, response.blob('text/plain'), {binary: true})
                    console.log(`File '${fetched_file_name}' added to archive`)
                }
            })
            .then(() => {
                console.log(zip_archive)
                zip_archive.generateAsync({type:"blob"})
                .then(function (blob) {
                    console.log(`Saving zip archive`)
                    saveAs(blob, zip_filename);
                    console.log(`Zip archive saved`)
                })
                .finally(() => {
                    // Reenable export button
                    this.enableExportOptions(true)
                })
            })
        ;    
    }

    build_page(){
        let self = this
        return(
            // TODO: 2021/03/20, Elvis - Fix formatting of control panel elements using Ant Design Row/Col components
            <div>
                <div id='gldiv'></div>
                {/* <!--<hr style='margin: 0;'>--> */}
                <br/>
                <div id='outer'>
                    <div id='buttons'>
                
                        {/* <!--<br><table border='1' width='100%' cellspacing='0' cellpadding='0'><tr><td valign='top'>-->  */}
                        {/* <font style={{color: 'white', fontSize:'12pt'}}>Surface:</font> */}
                        <font style={{ fontSize:'12pt' }}><b> Surface: </b></font>
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
                        
                        {/* <font style={{color: 'white', fontSize:'12pt'}}>Surface Potential:</font> */}
                        <font style={{fontSize:'12pt'}}><b> Surface Potential: </b></font>
                        
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
                            {/* <p style={{color: 'white', fontSize: '16px'}}> Min </p> */}
                            <p style={{fontSize: '16px'}}>Min</p>
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
                            {/* <p style={{color: 'white', fontSize: '16px'}}> Max </p> */}
                            <p style={{fontSize: '16px'}}> Max </p>
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
                        {/* <div className='inner'> */}
                            {/* <ul className='button-group round'> */}
                                {/* <input type='button' button className='button-backbone pure-button' style={{width: '85px', height: '30px', color: 'black'}} input type='button' value='Reset' onClick={this.reset_vals}></input> */}
                                {/* <Button 
                                    // style={{width: '85px', height: '30px', color: 'black'}} 
                                    // style={{marginLeft: '10px'}} 
                                    onClick={this.reset_vals}
                                    shape='round'
                                >Reset</Button> */}
                            {/* </ul> */}
                        {/* </div> */}
                        <Button 
                            // style={{width: '85px', height: '30px', color: 'black'}} 
                            // style={{marginLeft: '10px'}} 
                            onClick={this.reset_vals}
                            shape='round'
                        >Reset</Button>
                        <br/>
                        <br/>
                        
                        {/* <font style={{color:'white', fontSize: '12pt'}}>Model:</font>&nbsp;&nbsp; */}
                        <font style={{fontSize: '12pt'}}><b> Model: </b></font>&nbsp;&nbsp;
                        
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
                        <font style={{fontSize: '12pt'}}><b> Scheme: </b></font>
                        
                        
                        
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
                        <br/>
                        <br/>
                        
                        <font style={{fontSize:'12pt'}}><b> Labels: </b></font>
                        <Switch 
                                // className='switch3-input'
                                checkedChildren='Add'
                                unCheckedChildren='Remove'
                                // defaultChecked
                                onClick={(e) => this.surface_labels(e)}
                        />
                        <br/>
                        <br/>
                        
                        {/* <div className='inner'><ul className='button-group round'><input type='button' button className='button-backbone pure-button' style={{width: '85px', height: '30px', color: 'black'}} input type='button' value='Recenter' onClick='glviewer.zoomTo();'></input></ul></div> */}
                        {/* <div className='inner'><ul className='button-group round'><input type='button' button className='button-backbone pure-button' style={{width: '85px', height: '30px', color: 'black'}} input type='button' value='Recenter' onClick={(e) => {self.glviewer.zoomTo()}}></input></ul></div> */}
                        <div>
                            <Button onClick={(e) => {self.glviewer.zoomTo()}} shape='round'> Recenter </Button>
                            <br/>
                            <br/>
                        </div>
                        
                        {/* Background Transparency slider */}
                        <div id='transparency-div'>
                            {/* // "<br><font style='color:white; font-size:12pt'>Background Transparency:</font>" + */}
                            {/* <font style={{color:'white', fontSize:'12pt'}}>Background Transparency:</font> */}
                            <font style={{fontSize:'12pt'}}><b> Background Transparency: </b></font>
                            {/* <p style={{color:'white', fontSize: '16px'}}> <input type='range' min={0} max={100} value={0} id='transparency_slider' step={5} onInput='adjustBackgroundTransparency(value)'/>&nbsp;&nbsp;&nbsp;&nbsp; <span id='bg_alpha_val'> 0 </span> </p> */}
                            <Row>
                                <Col span={12}>
                                {/* <br/> */}
                                    <Slider 
                                        min={0}
                                        max={100}
                                        step={5}
                                        // value={-5}
                                        // value={this.protein.min_isoval}
                                        value={this.state.transparancy_val}
                                        onChange={(e) => this.adjustBackgroundTransparency(e)}
                                        // marks={{
                                        //     '-50': '-50 kT/e',
                                        //     '50':  '50 kT/e'
                                        // }}
                                    />
                                </Col>
                                <Col span={4}>
                                    <InputNumber
                                        min={0}
                                        max={100}
                                        step={5}
                                        style={{ margin: '0 16px' }}
                                        value={this.state.transparancy_val}
                                        formatter={value => `${value}`}
                                        parser={value => value.replace(/[^0-9]+/g, '')}
                                        onChange={(e) => this.adjustBackgroundTransparency(e)}
                                        // disabled
                                    />
                                </Col>
                            </Row>                        
                            <br/>

                            {/* Export Options */}
                            <div>
                                {/* <font style={{color: 'white', fontSize:'12pt'}}>Export as: </font> */}
                                <font style={{fontSize:'12pt'}}><b> Export as: </b></font>
                                {/* <Select className='styled-select' id='select_export_type' value={this.state.export_type} onChange={(value) => this.renderExportButtonText(value)} style={{maxWidth:'50%'}}> */}
                                <Select className='styled-select' id='select_export_type' value={this.state.export_type} disabled={this.state.disable_export_menu} onChange={(value) => this.setState({ export_type: value })} style={{maxWidth:'50%'}}>
                                    <Option style={{color: 'black'}} value='png'> PNG </Option>
                                    <Option style={{color: 'black'}} value='pymol'> PyMol </Option>
                                    <Option style={{color: 'black'}} value='unitymol'> UnityMol </Option>
                                </Select>
                            </div>
                            
                            
                            {/* Export button */}
                                {/* <div className='inner'><ul className='button-group round'><input type='button' button className='button-backbone pure-button' style={{width: '85px', height: '30px', color: 'black', marginTop: '10px'}} input type='button' id='export-button' value='Export' onclick='savePng()'></input></ul></div> */}
                                {/* <div className='inner'>
                                    <ul className='button-group round'>
                                        <input 
                                            type='button' 
                                            button 
                                            className='button-backbone pure-button' 
                                            style={{width: '85px', height: '30px', color: 'black', marginTop: '10px'}} 
                                            input 
                                            type='button' id='export-button' value='Export'
                                            disabled={this.state.disable_export_button}
                                            onClick={this.handleExportClick}
                                        />
                                    </ul>
                                </div> */}
                            <Button shape='round' onClick={this.handleExportClick} disabled={this.state.disable_export_button}> Export </Button>
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
                    {this.build_page()}
                    {/* {this.getpqr( this.jobid, this.pqr_prefix, this.storage_host )} */}
                    {/* {this.getcube( this.jobid, this.pqr_prefix, this.storage_host )} */}
                    {/* {this.get_dx( this.jobid, this.pqr_prefix, this.storage_host )} */}
                    {/* {this.get_volume_data( this.jobid, this.pqr_prefix, 'dx' )} */}
            </div>
        )
    }
}

export default VizLegacyPage