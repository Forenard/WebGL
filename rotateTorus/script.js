onload = function () {
    // canvasエレメントを取得
    var c = document.getElementById('canvas');
    c.width = 900;
    c.height = 900;

    // webglコンテキストを取得
    var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    //カリングをオン
    /**
     * 時計回りを[ 表 ]にする：gl.frontFace(gl.CW);
     * 時計回りを[ 裏 ]にする(既定値)：gl.frontFace(gl.CCW);
    */
    gl.enable(gl.CULL_FACE);

    //深度テストをオン
    gl.enable(gl.DEPTH_TEST);

    // canvasを初期化する色を設定する
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // canvasを初期化する際の深度を設定する
    gl.clearDepth(1.0);

    // canvasを初期化
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 頂点シェーダとフラグメントシェーダの生成
    var v_shader = create_shader('vs');
    var f_shader = create_shader('fs');

    // プログラムオブジェクトの生成とリンク
    var prg = create_program(v_shader, f_shader);

    // attributeLocationの取得
    var attLocation = new Array(2);
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    attLocation[1] = gl.getAttribLocation(prg, 'color');

    // attributeの要素数(この場合は xyz の3要素)
    var attStride = new Array(2);
    attStride[0] = 3;
    attStride[1] = 4;

    // モデル(頂点)データ
    var torus_data = torus(24, 48, 0.1, 1);

    var vertex_position = torus_data[0];


    var vertex_color = torus_data[1];

    // 頂点のインデックスを格納する配列
    var index = torus_data[2];

    // VBOの生成
    var vbo = new Array(2);
    vbo[0] = create_vbo(vertex_position);
    vbo[1] = create_vbo(vertex_color);

    // VBOをバインド&登録
    set_attribute(vbo, attLocation, attStride);

    // IBOの生成
    var ibo = create_ibo(index);

    // IBOをバインドして登録する
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    //unilocation
    var uniLocation = gl.getUniformLocation(prg, "mvpMatrix");

    // minMatrix.js を用いた行列関連処理
    // matIVオブジェクトを生成
    var m = new matIV();

    // 各種行列の生成と初期化
    var mMatrix = m.identity(m.create());
    var vMatrix = m.identity(m.create());
    var pMatrix = m.identity(m.create());
    var vpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());





    var count = 0;

    var rand = new Array(100);
    for (let i = 0; i < 100; i++) {
        rand[i] = Math.random() * 2 - 1;
    }

    (function () {
        // canvasを初期化
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // カウンタをインクリメントする
        count++;

        // カウンタを元にラジアンを算出
        var rad = 3 * count * Math.PI / 180;
        var theta = 45 * Math.PI / 180 + rad;

        //veiw
        // ビュー座標変換行列
        m.lookAt([7 * Math.sin(count / 10), Math.sin(count / 15), 7 * Math.cos(count / 10)], [0, 0, 0], [0, 1, 0], vMatrix);
        m.perspective(90 + 20 * Math.sin(count / 10), c.width / c.height, 0.1, 100, pMatrix);


        // 各行列を掛け合わせ座標変換行列を完成させる
        m.multiply(pMatrix, vMatrix, vpMatrix);

        //1

        for (let i = 0; i < 20; i++) {
            m.identity(mMatrix);

            m.rotate(mMatrix, 3 * theta, [0, 0, 1], mMatrix);
            m.rotate(mMatrix, i * theta + i * Math.PI / 20 / 180, [0, 0, 1], mMatrix);
            m.rotate(mMatrix, i * theta + i * Math.PI / 20 / 180, [0, 1, 0], mMatrix);
            m.rotate(mMatrix, i * theta + i * Math.PI / 20 / 180, [1, 0, 0], mMatrix);
            m.translate(mMatrix, [0, i / 5, 0], mMatrix);

            m.multiply(vpMatrix, mMatrix, mvpMatrix);
            gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
            gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
        }



        // コンテキストの再描画
        gl.flush();

        // ループのために再帰呼び出し
        setTimeout(arguments.callee, 1000 / 30);
    })();

    function torus(row, column, irad, orad) {
        var pos = new Array(), col = new Array(), idx = new Array();
        for (var i = 0; i <= row; i++) {
            var r = Math.PI * 2 / row * i;
            var rr = Math.cos(r);
            var ry = Math.sin(r);
            for (var ii = 0; ii <= column; ii++) {
                var tr = Math.PI * 2 / column * ii;
                var tx = (rr * irad + orad) * Math.cos(tr);
                var ty = ry * irad;
                var tz = (rr * irad + orad) * Math.sin(tr);
                pos.push(tx, ty, tz);
                var tc = hsva(360 / column * ii, 1, 1, 1);
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }
        for (i = 0; i < row; i++) {
            for (ii = 0; ii < column; ii++) {
                r = (column + 1) * i + ii;
                idx.push(r, r + column + 1, r + 1);
                idx.push(r + column + 1, r + column + 2, r + 1);
            }
        }
        return [pos, col, idx];
    }

    function hsva(h, s, v, a) {
        if (s > 1 || v > 1 || a > 1) { return; }
        var th = h % 360;
        var i = Math.floor(th / 60);
        var f = th / 60 - i;
        var m = v * (1 - s);
        var n = v * (1 - s * f);
        var k = v * (1 - s * (1 - f));
        var color = new Array();
        if (!s > 0 && !s < 0) {
            color.push(v, v, v, a);
        } else {
            var r = new Array(v, n, m, m, k, v);
            var g = new Array(k, v, v, n, m, m);
            var b = new Array(m, m, k, v, v, n);
            color.push(r[i], g[i], b[i], a);
        }
        return color;
    }

    // IBOを生成する関数
    function create_ibo(data) {
        // バッファオブジェクトの生成
        var ibo = gl.createBuffer();

        // バッファをバインドする
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

        // バッファにデータをセット
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

        // バッファのバインドを無効化
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // 生成したIBOを返して終了
        return ibo;
    }

    // VBOをバインドし登録する関数
    function set_attribute(vbo, attL, attS) {
        // 引数として受け取った配列を処理する
        for (var i in vbo) {
            // バッファをバインドする
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);

            // attributeLocationを有効にする
            gl.enableVertexAttribArray(attL[i]);

            // attributeLocationを通知し登録する
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
        }
    }

    // シェーダを生成する関数
    function create_shader(id) {
        // シェーダを格納する変数
        var shader;

        // HTMLからscriptタグへの参照を取得
        var scriptElement = document.getElementById(id);

        // scriptタグが存在しない場合は抜ける
        if (!scriptElement) { return; }

        // scriptタグのtype属性をチェック
        switch (scriptElement.type) {

            // 頂点シェーダの場合
            case 'x-shader/x-vertex':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;

            // フラグメントシェーダの場合
            case 'x-shader/x-fragment':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default:
                return;
        }

        // 生成されたシェーダにソースを割り当てる
        gl.shaderSource(shader, scriptElement.text);

        // シェーダをコンパイルする
        gl.compileShader(shader);

        // シェーダが正しくコンパイルされたかチェック
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

            // 成功していたらシェーダを返して終了
            return shader;
        } else {

            // 失敗していたらエラーログをアラートする
            alert(gl.getShaderInfoLog(shader));
        }
    }

    // プログラムオブジェクトを生成しシェーダをリンクする関数
    function create_program(vs, fs) {
        // プログラムオブジェクトの生成
        var program = gl.createProgram();

        // プログラムオブジェクトにシェーダを割り当てる
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);

        // シェーダをリンク
        gl.linkProgram(program);

        // シェーダのリンクが正しく行なわれたかチェック
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {

            // 成功していたらプログラムオブジェクトを有効にする
            gl.useProgram(program);

            // プログラムオブジェクトを返して終了
            return program;
        } else {

            // 失敗していたらエラーログをアラートする
            alert(gl.getProgramInfoLog(program));
        }
    }

    // VBOを生成する関数
    function create_vbo(data) {
        // バッファオブジェクトの生成
        var vbo = gl.createBuffer();

        // バッファをバインドする
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        // バッファにデータをセット
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

        // バッファのバインドを無効化
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // 生成した VBO を返して終了
        return vbo;
    }

};